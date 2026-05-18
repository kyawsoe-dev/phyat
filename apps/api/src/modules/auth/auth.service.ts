import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TierCode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { TIER_SELECT, TierCapabilities } from '../subscriptions/application/tier-capability.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto';

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
      select: { id: true, email: true, name: true, createdAt: true, passwordHash: true, tier: { select: TIER_SELECT } },
    });

    return this.session(user);
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: { id: true, email: true, name: true, createdAt: true, passwordHash: true, tier: { select: TIER_SELECT } },
    });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

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
}
