import { Injectable } from '@nestjs/common';
import { UsageFeature } from '@prisma/client';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  monthStart(date = new Date()) {
    const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    month.setUTCHours(0, 0, 0, 0);
    return month;
  }

  async getCount(userId: string, feature: UsageFeature, date = new Date()) {
    const item = await this.prisma.usageCounter.findUnique({
      where: { userId_feature_month: { userId, feature, month: this.monthStart(date) } },
      select: { count: true },
    });
    return item?.count ?? 0;
  }

  async increment(userId: string, tierId: string, feature: UsageFeature, amount = 1, date = new Date()) {
    return this.prisma.usageCounter.upsert({
      where: { userId_feature_month: { userId, feature, month: this.monthStart(date) } },
      update: { count: { increment: amount }, tierId },
      create: { userId, tierId, feature, month: this.monthStart(date), count: amount },
    });
  }

  async currentUsage(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { tier: true },
    });
    const month = this.monthStart();
    const counters = await this.prisma.usageCounter.findMany({ where: { userId, month } });
    const byFeature = Object.fromEntries(counters.map((c) => [c.feature, c.count]));
    return {
      month: month.toISOString(),
      tier: user.tier,
      usage: {
        LINKS: byFeature.LINKS ?? 0,
        QR_CODES: byFeature.QR_CODES ?? 0,
        CUSTOM_DOMAINS: byFeature.CUSTOM_DOMAINS ?? 0,
        API_KEYS: byFeature.API_KEYS ?? 0,
        WEBHOOKS: byFeature.WEBHOOKS ?? 0,
        API_CALLS: byFeature.API_CALLS ?? 0,
        WEBHOOK_DELIVERIES: byFeature.WEBHOOK_DELIVERIES ?? 0,
        EXPORTS: byFeature.EXPORTS ?? 0,
        BULK_ROWS: byFeature.BULK_ROWS ?? 0,
      },
      limits: {
        LINKS: user.tier.maxLinksPerMonth,
        QR_CODES: user.tier.maxQrCodesPerMonth,
        CUSTOM_DOMAINS: user.tier.maxCustomDomains,
        API_KEYS: user.tier.maxApiKeys,
        WEBHOOKS: user.tier.maxWebhooks,
        BULK_ROWS: user.tier.bulkCreateLimit,
        API_CALLS: user.tier.apiRateLimitPerMinute,
      },
    };
  }
}
