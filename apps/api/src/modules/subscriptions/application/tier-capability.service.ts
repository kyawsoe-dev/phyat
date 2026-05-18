import { ForbiddenException, Injectable } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { PrismaService } from '../../../common/prisma.service';

export type FeatureFlag =
  | 'customDomains'
  | 'apiAccess'
  | 'webhooks'
  | 'advancedAnalytics'
  | 'utmBuilder'
  | 'qrCustomization'
  | 'bulkImport'
  | 'exportData'
  | 'campaignsEnabled';

export type LimitKey =
  | 'maxLinksPerMonth'
  | 'maxQrCodesPerMonth'
  | 'maxCustomDomains'
  | 'maxApiKeys'
  | 'maxWebhooks'
  | 'bulkCreateLimit'
  | 'analyticsRetentionDays'
  | 'apiRateLimitPerMinute';

export const TIER_SELECT = {
  id: true,
  code: true,
  name: true,
  maxLinks: true,
  maxLinksPerMonth: true,
  maxQrCodesPerMonth: true,
  maxCustomDomains: true,
  maxApiKeys: true,
  maxWebhooks: true,
  bulkCreateLimit: true,
  analyticsRetentionDays: true,
  apiRateLimitPerMinute: true,
  priceMonthly: true,
  priceAnnual: true,
  annualDiscountPercent: true,
  features: true,
  customDomains: true,
  apiAccess: true,
  webhooks: true,
  advancedAnalytics: true,
  utmBuilder: true,
  qrCustomization: true,
  bulkImport: true,
  exportData: true,
  campaignsEnabled: true,
  isActive: true,
  isPublic: true,
  sortOrder: true,
} as const;

export type TierCapabilities = Pick<
  Tier,
  | 'id'
  | 'code'
  | 'name'
  | 'maxLinks'
  | 'maxLinksPerMonth'
  | 'maxQrCodesPerMonth'
  | 'maxCustomDomains'
  | 'maxApiKeys'
  | 'maxWebhooks'
  | 'bulkCreateLimit'
  | 'analyticsRetentionDays'
  | 'apiRateLimitPerMinute'
  | 'priceMonthly'
  | 'priceAnnual'
  | 'annualDiscountPercent'
  | 'features'
  | FeatureFlag
  | 'isActive'
  | 'isPublic'
  | 'sortOrder'
>;

@Injectable()
export class TierCapabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserTier(userId: string): Promise<TierCapabilities> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { tier: { select: TIER_SELECT } },
    });
    return user.tier;
  }

  requireFeature(tier: TierCapabilities, feature: FeatureFlag) {
    if (!tier[feature]) {
      throw new ForbiddenException({
        code: 'UPGRADE_REQUIRED',
        feature,
        message: `${this.label(feature)} is not included in the ${tier.name} plan. Please upgrade your plan.`,
      });
    }
  }

  requireLimit(tier: TierCapabilities, limitKey: LimitKey, current: number, increment = 1) {
    const limit = tier[limitKey];
    if (limit !== null && limit !== undefined && current + increment > limit) {
      throw new ForbiddenException({
        code: 'UPGRADE_REQUIRED',
        limitKey,
        limit,
        current,
        requested: increment,
        message: `${this.label(limitKey)} limit reached for the ${tier.name} plan. Please upgrade your plan.`,
      });
    }
  }

  private label(value: string) {
    return value.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }
}
