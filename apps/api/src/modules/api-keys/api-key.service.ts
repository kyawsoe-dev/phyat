import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, timingSafeEqual, createHash } from 'crypto';
import { UsageFeature } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { TierCapabilityService, TIER_SELECT } from '../subscriptions/application/tier-capability.service';
import { UsageService } from '../subscriptions/application/usage.service';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tiers: TierCapabilityService,
    private readonly usage: UsageService,
  ) {}

  async create(userId: string, name = 'Default API key') {
    const tier = await this.tiers.getUserTier(userId);
    this.tiers.requireFeature(tier, 'apiAccess');
    const count = await this.prisma.apiKey.count({ where: { userId, revokedAt: null } });
    this.tiers.requireLimit(tier, 'maxApiKeys', count);
    const secret = `phyat_live_${randomBytes(24).toString('base64url')}`;
    const keyHash = this.hash(secret);
    const key = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        prefix: 'phyat_live',
        keyHash,
        lastFour: secret.slice(-4),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastFour: true,
        createdAt: true,
        revokedAt: true,
      },
    });

    await this.usage.increment(userId, tier.id, UsageFeature.API_KEYS);
    return { ...key, secret };
  }

  async revoke(id: string, userId: string) {
    return this.prisma.apiKey.updateMany({
      where: { id, userId },
      data: { revokedAt: new Date() },
    });
  }

  async activate(id: string, userId: string) {
    return this.prisma.apiKey.updateMany({
      where: { id, userId },
      data: { revokedAt: null },
    });
  }

  list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastFour: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true,
      },
    });
  }

  async authenticate(rawKey?: string) {
    if (!rawKey || !rawKey.startsWith('phyat_live_')) {
      throw new UnauthorizedException('Valid PH_API_KEY is required.');
    }

    const keyHash = this.hash(rawKey);
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: { select: { id: true, email: true, isAdmin: true, tier: { select: TIER_SELECT } } } },
    });

    if (!apiKey || apiKey.revokedAt) {
      throw new UnauthorizedException('Valid PH_API_KEY is required.');
    }

    const expected = Buffer.from(apiKey.keyHash);
    const actual = Buffer.from(keyHash);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('Valid PH_API_KEY is required.');
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });
    await this.usage.increment(apiKey.user.id, apiKey.user.tier.id, UsageFeature.API_CALLS);

    return {
      id: apiKey.user.id,
      email: apiKey.user.email,
      isAdmin: apiKey.user.isAdmin,
      tier: apiKey.user.tier,
    };
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
