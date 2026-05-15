import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, timingSafeEqual, createHash } from 'crypto';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name = 'Default API key') {
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
      },
    });

    return { ...key, secret };
  }

  async revoke(id: string, userId: string) {
    return this.prisma.apiKey.updateMany({
      where: { id, userId },
      data: { revokedAt: new Date() },
    });
  }

  list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastFour: true,
        lastUsedAt: true,
        createdAt: true,
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
      include: { user: { include: { tier: true } } },
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

    return {
      id: apiKey.user.id,
      email: apiKey.user.email,
      tier: {
        code: apiKey.user.tier.code,
        maxLinks: apiKey.user.tier.maxLinks,
      },
    };
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
