import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TierCode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import { createPublicKey, createVerify, type JsonWebKey as CryptoJsonWebKey } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { TIER_SELECT, TierCapabilities } from '../subscriptions/application/tier-capability.service';
import { ChangePasswordDto, GoogleLoginDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto';

type GoogleJwtHeader = {
  alg?: string;
  kid?: string;
};

type GoogleJwtPayload = {
  aud?: string;
  email?: string;
  email_verified?: boolean | string;
  exp?: number;
  iss?: string;
  name?: string;
  sub?: string;
};

type GoogleJwk = CryptoJsonWebKey & {
  kid?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    const freeTier = await this.ensureTier(TierCode.FREE, 'Free', 5);
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: await bcrypt.hash(input.password, 12),
        tierId: freeTier.id,
      },
      select: { id: true, email: true, name: true, createdAt: true, passwordHash: true, tier: { select: TIER_SELECT } },
    });

    return this.fullSession(user);
  }

  private async fullSession(user: { id: string; email: string; name: string | null; tier: TierCapabilities }) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email }, { expiresIn: '7d' });
    return { accessToken, user: { id: user.id, email: user.email, name: user.name, tier: user.tier } };
  }

  private async tempSession(user: { id: string; email: string; name: string | null }, type?: 'admin') {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email }, { expiresIn: '5m' });
    if (type === 'admin') {
      return { accessToken, requiresAdmin2fa: true, user: { id: user.id, email: user.email, name: user.name } };
    }
    return { accessToken, requires2fa: true, user: { id: user.id, email: user.email, name: user.name } };
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: { id: true, email: true, name: true, user2faEnabled: true, admin2faEnabled: true, createdAt: true, passwordHash: true, loginAttempts: true, lockedUntil: true, tier: { select: TIER_SELECT } } as any,
    }) as any;

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      throw new UnauthorizedException(`Account is temporarily locked. Try again in ${remaining} seconds.`);
    }

    if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      // Increment failed attempts and potentially lock account
      if (user) {
        const attempts = user.loginAttempts + 1;
        const updateData: Record<string, unknown> = { loginAttempts: attempts };
        if (attempts >= 5) {
          updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
          updateData.loginAttempts = 0;
        }
        await this.prisma.user.update({ where: { id: user.id }, data: updateData as any });
      }
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Reset failed attempts on successful login
    await this.prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null } as any });

    const userForSession = { id: user.id, email: user.email, name: user.name, tier: user.tier };
    if (user.user2faEnabled) {
      return this.tempSession(userForSession);
    }

    if (user.admin2faEnabled) {
      return this.tempSession(userForSession, 'admin');
    }

    return this.fullSession(userForSession);
  }

  async googleLogin(input: GoogleLoginDto) {
    const profile = await this.verifyGoogleIdToken(input.idToken);
    const freeTier = await this.ensureTier(TierCode.FREE, 'Free', 5);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.sub }, { email: profile.email }],
      },
      select: { id: true, email: true, name: true, user2faEnabled: true, createdAt: true, passwordHash: true, googleId: true, tier: { select: TIER_SELECT } },
    });

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            email: profile.email,
            googleId: existing.googleId ?? profile.sub,
            name: existing.name ?? profile.name,
          },
          select: { id: true, email: true, name: true, user2faEnabled: true, createdAt: true, passwordHash: true, tier: { select: TIER_SELECT } },
        })
      : await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.sub,
            tierId: freeTier.id,
          },
          select: { id: true, email: true, name: true, user2faEnabled: true, createdAt: true, passwordHash: true, tier: { select: TIER_SELECT } },
        });

    if (user.user2faEnabled) {
      return this.tempSession(user);
    }

    return this.fullSession(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, isAdmin: true, user2faEnabled: true, admin2faEnabled: true, createdAt: true, passwordHash: true, tier: { select: TIER_SELECT } },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      user2faEnabled: user.user2faEnabled,
      admin2faEnabled: user.admin2faEnabled,
      hasPassword: !!user.passwordHash,
      createdAt: user.createdAt,
      tier: user.tier,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileDto) {
    const sanitized = input.name ? input.name.replace(/<[^>]*>/g, '').trim() : input.name;
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: sanitized || null },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  async getUser2faStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { user2faEnabled: true },
    });
    return { enabled: user.user2faEnabled };
  }

  async generateUser2faSecret(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, user2faEnabled: true },
    });

    if (user.user2faEnabled) {
      throw new UnauthorizedException('2FA is already enabled.');
    }

    const secret = speakeasy.generateSecret({
      name: `Phyat (${user.email})`,
      issuer: 'Phyat',
      length: 20,
      otpauth_url: true,
    } as speakeasy.GenerateSecretWithOtpAuthUrlOptions);

    await this.prisma.user.update({
      where: { id: userId },
      data: { user2faSecret: secret.base32 },
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async verifyUser2faSetup(userId: string, token: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { user2faSecret: true, user2faEnabled: true },
    });

    if (!user.user2faSecret) {
      throw new UnauthorizedException('2FA setup not initiated.');
    }

    if (user.user2faEnabled) {
      throw new UnauthorizedException('2FA is already enabled.');
    }

    const normalizedToken = token.replace(/\D/g, '').slice(0, 6);
    const isValid = speakeasy.totp.verify({
      secret: user.user2faSecret,
      encoding: 'base32',
      token: normalizedToken,
      window: 2,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid authentication code.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { user2faEnabled: true },
    });

    return { success: true };
  }

  async disableUser2fa(userId: string, password?: string, token?: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.passwordHash) {
      if (!password) {
        throw new UnauthorizedException('Password is required to disable 2FA.');
      }
      if (!(await bcrypt.compare(password, user.passwordHash))) {
        throw new UnauthorizedException('Current password is incorrect.');
      }
    } else {
      if (!token) {
        throw new UnauthorizedException('Verification code is required to disable 2FA.');
      }
      if (!user.user2faSecret) {
        throw new UnauthorizedException('2FA is not properly configured.');
      }
      const normalizedToken = token.replace(/\D/g, '').slice(0, 6);
      const isValid = speakeasy.totp.verify({
        secret: user.user2faSecret,
        encoding: 'base32',
        token: normalizedToken,
        window: 2,
      });
      if (!isValid) {
        throw new UnauthorizedException('Invalid verification code.');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { user2faSecret: null, user2faEnabled: false },
    });

    return { success: true };
  }

  async changePassword(userId: string, input: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.passwordHash) {
      throw new UnauthorizedException('Password sign-in is not enabled for this account.');
    }

    if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(input.newPassword, 12) },
    });

    return { success: true };
  }

  async verifyLogin2fa(userId: string, totp: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { user2faSecret: true, user2faEnabled: true },
    });

    if (!user.user2faEnabled || !user.user2faSecret) {
      throw new UnauthorizedException('2FA is not enabled for this account.');
    }

    const normalizedToken = totp.replace(/\D/g, '').slice(0, 6);
    const isValid = speakeasy.totp.verify({
      secret: user.user2faSecret,
      encoding: 'base32',
      token: normalizedToken,
      window: 2,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code.');
    }

    const accessToken = await this.jwt.signAsync({ sub: userId, email: '' }, { expiresIn: '7d' });
    return { accessToken };
  }

  private ensureTier(code: TierCode, name: string, maxLinks: number | null) {
    return this.prisma.tier.upsert({
      where: { code },
      update: { name, maxLinks },
      create: { code, name, maxLinks },
    });
  }

  private async verifyGoogleIdToken(idToken: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new UnauthorizedException('Google sign-in is not configured.');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = idToken.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException('Invalid Google credential.');
    }

    const header = this.decodeJwtPart<GoogleJwtHeader>(encodedHeader);
    const payload = this.decodeJwtPart<GoogleJwtPayload>(encodedPayload);
    if (header.alg !== 'RS256' || !header.kid || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Google credential.');
    }

    if (payload.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss ?? '')) {
      throw new UnauthorizedException('Invalid Google credential.');
    }

    if (!payload.exp || payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('Google credential has expired.');
    }

    if (payload.email_verified !== true && payload.email_verified !== 'true') {
      throw new UnauthorizedException('Google email is not verified.');
    }

    const jwksResponse = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (!jwksResponse.ok) {
      throw new UnauthorizedException('Unable to verify Google credential.');
    }

    const jwks = (await jwksResponse.json()) as { keys?: GoogleJwk[] };
    const jwk = jwks.keys?.find((key) => key.kid === header.kid);
    if (!jwk) {
      throw new UnauthorizedException('Unable to verify Google credential.');
    }

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    const signature = Buffer.from(encodedSignature, 'base64url');
    const isValid = verifier.verify(createPublicKey({ key: jwk, format: 'jwk' }), signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid Google credential.');
    }

    return {
      email: payload.email.toLowerCase(),
      name: payload.name,
      sub: payload.sub,
    };
  }

  private decodeJwtPart<T>(value: string): T {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
    } catch {
      throw new UnauthorizedException('Invalid Google credential.');
    }
  }
}
