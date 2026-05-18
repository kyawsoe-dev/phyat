import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingCycle, TierCode } from '@prisma/client';
import { PrismaService } from '../../../common/prisma.service';
import { SubscriptionRepository } from '../infrastructure/subscription.repository';
import { CouponRepository } from '../infrastructure/coupon.repository';
import { TIER_SELECT } from './tier-capability.service';
import { UsageService } from './usage.service';
import type { AdminTierDto, ReorderTiersDto, UpgradeDto } from './dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly couponRepo: CouponRepository,
    private readonly usage: UsageService,
  ) {}

  async getPlans(includeInactive = false) {
    const tiers = await this.prisma.tier.findMany({
      where: includeInactive ? undefined : { isActive: true, isPublic: true },
      orderBy: [{ sortOrder: 'asc' }, { priceMonthly: 'asc' }],
      select: TIER_SELECT,
    });
    return tiers.map((tier) => this.formatPlan(tier));
  }

  async getCurrentSubscription(userId: string) {
    const sub = await this.subscriptionRepo.findActive(userId);
    if (!sub) return null;
    return {
      id: sub.id,
      tierCode: sub.tier.code,
      tierName: sub.tier.name,
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      canceledAt: sub.canceledAt?.toISOString() ?? null,
      createdAt: sub.createdAt.toISOString(),
    };
  }

  getCurrentUsage(userId: string) {
    return this.usage.currentUsage(userId);
  }

  async upgrade(userId: string, input: UpgradeDto) {
    const tier = await this.prisma.tier.findUnique({ where: { code: input.tierCode } });
    if (!tier || !tier.isActive) throw new NotFoundException('Plan not found');

    let discountPercent = input.billingCycle === 'ANNUAL' ? tier.annualDiscountPercent : 0;

    if (input.couponCode) {
      const coupon = await this.couponRepo.findByCode(input.couponCode);
      if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid or expired coupon code');
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('Coupon code has expired');
      if (coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Coupon code has reached its usage limit');
      const redemption = await this.couponRepo.findRedemption(coupon.id, userId);
      if (!redemption) {
        await this.couponRepo.createRedemption(coupon.id, userId);
        await this.couponRepo.incrementUsed(coupon.id);
      }
      discountPercent = Math.max(discountPercent, coupon.discountPercent);
    }

    const basePrice = input.billingCycle === 'ANNUAL' ? tier.priceAnnual ?? 0 : tier.priceMonthly ?? 0;
    const finalPrice = basePrice - Math.round(basePrice * (discountPercent / 100));
    const now = new Date();
    const periodEnd = new Date(now);
    if (input.billingCycle === 'ANNUAL') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    await this.subscriptionRepo.create({
      userId,
      tierId: tier.id,
      billingCycle: input.billingCycle as BillingCycle,
      currentPeriodEnd: periodEnd,
    });

    await this.prisma.user.update({ where: { id: userId }, data: { tierId: tier.id } });

    return {
      success: true,
      tierCode: tier.code,
      billingCycle: input.billingCycle,
      amount: finalPrice,
      discountPercent,
      currentPeriodEnd: periodEnd.toISOString(),
    };
  }

  async cancel(userId: string) {
    const sub = await this.subscriptionRepo.findActive(userId);
    if (!sub) throw new NotFoundException('No active subscription found');
    await this.subscriptionRepo.cancel(sub.id);
    return { success: true, message: 'Subscription canceled' };
  }

  async redeemCoupon(userId: string, code: string) {
    const coupon = await this.couponRepo.findByCode(code);
    if (!coupon || !coupon.isActive) return { valid: false, discountPercent: 0, message: 'Invalid or expired coupon code' };
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid: false, discountPercent: 0, message: 'Coupon code has expired' };
    if (coupon.usedCount >= coupon.maxUses) return { valid: false, discountPercent: 0, message: 'Coupon code has reached its usage limit' };
    const existing = await this.couponRepo.findRedemption(coupon.id, userId);
    if (existing) return { valid: false, discountPercent: 0, message: 'You have already used this code' };
    await this.couponRepo.createRedemption(coupon.id, userId);
    await this.couponRepo.incrementUsed(coupon.id);
    return { valid: true, code: coupon.code, discountPercent: coupon.discountPercent, message: `Coupon applied! You save ${coupon.discountPercent}%` };
  }

  async createTier(input: AdminTierDto) {
    return this.prisma.tier.create({ data: this.toTierData(input), select: TIER_SELECT });
  }

  async updateTier(id: string, input: AdminTierDto) {
    return this.prisma.tier.update({ where: { id }, data: this.toTierData(input), select: TIER_SELECT });
  }

  async setTierStatus(id: string, isActive: boolean) {
    return this.prisma.tier.update({ where: { id }, data: { isActive }, select: TIER_SELECT });
  }

  async reorderTiers(input: ReorderTiersDto) {
    await this.prisma.$transaction(
      input.items.map((item) => this.prisma.tier.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })),
    );
    return this.getPlans(true);
  }

  private formatPlan(tier: any) {
    const monthly = tier.priceMonthly ?? 0;
    const annual = tier.priceAnnual ?? 0;
    return {
      ...tier,
      description: tier.description ?? '',
      annualDiscountPercent: tier.annualDiscountPercent ?? 0,
      monthlyPriceFormatted: monthly === 0 ? 'Free' : `$${(monthly / 100).toFixed(monthly % 100 === 0 ? 0 : 2)}`,
      annualPriceFormatted: annual === 0 ? 'Free' : `$${(annual / 100).toFixed(annual % 100 === 0 ? 0 : 2)}`,
      monthlyPriceLabel: monthly === 0 ? 'Free' : `$${(monthly / 100).toFixed(0)}/mo`,
      annualPriceLabel: annual === 0 ? 'Free' : `$${(annual / 100).toFixed(0)}/yr`,
    };
  }

  private toTierData(input: AdminTierDto) {
    return {
      code: input.code,
      name: input.name,
      description: input.description,
      features: input.features,
      maxLinks: input.maxLinksPerMonth,
      maxLinksPerMonth: input.maxLinksPerMonth,
      maxQrCodesPerMonth: input.maxQrCodesPerMonth,
      maxCustomDomains: input.maxCustomDomains,
      maxApiKeys: input.maxApiKeys,
      maxWebhooks: input.maxWebhooks,
      bulkCreateLimit: input.bulkCreateLimit,
      analyticsRetentionDays: input.analyticsRetentionDays,
      apiRateLimitPerMinute: input.apiRateLimitPerMinute,
      priceMonthly: input.priceMonthly,
      priceAnnual: input.priceAnnual,
      annualDiscountPercent: input.annualDiscountPercent,
      customDomains: input.customDomains,
      apiAccess: input.apiAccess,
      webhooks: input.webhooks,
      advancedAnalytics: input.advancedAnalytics,
      utmBuilder: input.utmBuilder,
      qrCustomization: input.qrCustomization,
      bulkImport: input.bulkImport,
      exportData: input.exportData,
      campaignsEnabled: input.campaignsEnabled,
      isActive: input.isActive,
      isPublic: input.isPublic,
      sortOrder: input.sortOrder,
    };
  }
}
