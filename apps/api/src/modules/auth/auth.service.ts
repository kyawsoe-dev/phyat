import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TierCode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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
      include: { tier: true },
    });

    return this.session(user);
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { tier: true },
    });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.session(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { tier: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: {
        code: user.tier.code,
        name: user.tier.name,
        maxLinks: user.tier.maxLinks,
      },
    };
  }

  private async session(user: { id: string; email: string; name: string | null; tier: { code: TierCode; name: string; maxLinks: number | null } }) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: {
          code: user.tier.code,
          name: user.tier.name,
          maxLinks: user.tier.maxLinks,
        },
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
}
