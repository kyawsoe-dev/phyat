import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TierCode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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

    return this.session(user);
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: { id: true, email: true, name: true, createdAt: true, passwordHash: true, tier: { select: TIER_SELECT } },
    });

    if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.session(user);
  }

  async googleLogin(input: GoogleLoginDto) {
    const profile = await this.verifyGoogleIdToken(input.idToken);
    const freeTier = await this.ensureTier(TierCode.FREE, 'Free', 5);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.sub }, { email: profile.email }],
      },
      select: { id: true, email: true, name: true, createdAt: true, passwordHash: true, googleId: true, tier: { select: TIER_SELECT } },
    });

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            email: profile.email,
            googleId: existing.googleId ?? profile.sub,
            name: existing.name ?? profile.name,
          },
          select: { id: true, email: true, name: true, createdAt: true, passwordHash: true, tier: { select: TIER_SELECT } },
        })
      : await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.sub,
            tierId: freeTier.id,
          },
          select: { id: true, email: true, name: true, createdAt: true, passwordHash: true, tier: { select: TIER_SELECT } },
        });

    return this.session(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true, passwordHash: true, tier: { select: TIER_SELECT } },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      tier: user.tier,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: input.name },
      select: { id: true, email: true, name: true, createdAt: true },
    });
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

  private async session(user: { id: string; email: string; name: string | null; tier: TierCapabilities }) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
    };
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
