import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { SubscriptionRepository } from '../infrastructure/subscription.repository';
import { CouponRepository } from '../infrastructure/coupon.repository';
import type { UpgradeDto } from './dto';

const PLAN_DISCOUNTS: Record<string, { monthly: number; annual: number }> = {
  FREE: { monthly: 0, annual: 0 },
  PRO: { monthly: 1300, annual: 12000 },
  DEVELOPER: { monthly: 2900, annual: 27600 },
};

const ANNUAL_DISCOUNT_PERCENT: Record<string, number> = {
  PRO: 23,
  DEVELOPER: 21,
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly couponRepo: CouponRepository,
  ) {}

  async getPlans() {
    const tiers = await this.prisma.tier.findMany({ orderBy: { priceMonthly: 'asc' } });
    return tiers.map((tier) => {
      const monthly = PLAN_DISCOUNTS[tier.code]?.monthly ?? 0;
      const annual = PLAN_DISCOUNTS[tier.code]?.annual ?? 0;
      const annualDiscountPercent = ANNUAL_DISCOUNT_PERCENT[tier.code] ?? 0;
      return {
        code: tier.code,
        name: tier.name,
        description: tier.description ?? '',
        priceMonthly: monthly,
        priceAnnual: annual,
        maxLinks: tier.maxLinks,
        features: tier.features,
        annualDiscountPercent,
        monthlyPriceFormatted: `$${(monthly / 100).toFixed(monthly % 100 === 0 ? 0 : 2)}`,
        annualPriceFormatted: `$${(annual / 100).toFixed(annual % 100 === 0 ? 0 : 2)}`,
        monthlyPriceLabel: monthly === 0 ? 'Free' : `$${(monthly / 100).toFixed(0)}/mo`,
        annualPriceLabel: annual === 0 ? 'Free' : `$${(annual / 100).toFixed(0)}/yr`,
      };
    });
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

  async upgrade(userId: string, input: UpgradeDto) {
    const tier = await this.prisma.tier.findUnique({ where: { code: input.tierCode } });
    if (!tier) throw new NotFoundException('Plan not found');

    let discountPercent = 0;
    if (input.billingCycle === 'ANNUAL') {
      discountPercent = ANNUAL_DISCOUNT_PERCENT[input.tierCode] ?? 0;
    }

    if (input.couponCode) {
      const coupon = await this.couponRepo.findByCode(input.couponCode);
      if (!coupon || !coupon.isActive) {
        throw new BadRequestException('Invalid or expired coupon code');
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new BadRequestException('Coupon code has expired');
      }
      if (coupon.usedCount >= coupon.maxUses) {
        throw new BadRequestException('Coupon code has reached its usage limit');
      }
      const redemption = await this.couponRepo.findRedemption(coupon.id, userId);
      if (!redemption) {
        await this.couponRepo.createRedemption(coupon.id, userId);
        await this.couponRepo.incrementUsed(coupon.id);
      }
      discountPercent = Math.max(discountPercent, coupon.discountPercent);
    }

    const priceKey = input.billingCycle === 'ANNUAL' ? 'priceAnnual' : 'priceMonthly';
    const basePrice = PLAN_DISCOUNTS[input.tierCode]?.[input.billingCycle === 'ANNUAL' ? 'annual' : 'monthly'] ?? 0;
    const finalPrice = basePrice - Math.round(basePrice * (discountPercent / 100));

    const now = new Date();
    const periodEnd = new Date(now);
    if (input.billingCycle === 'ANNUAL') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await this.subscriptionRepo.create({
      userId,
      tierId: tier.id,
      billingCycle: input.billingCycle,
      currentPeriodEnd: periodEnd,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { tierId: tier.id },
    });

    return {
      success: true,
      tierCode: input.tierCode,
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
    if (!coupon || !coupon.isActive) {
      return { valid: false, discountPercent: 0, message: 'Invalid or expired coupon code' };
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, discountPercent: 0, message: 'Coupon code has expired' };
    }
    if (coupon.usedCount >= coupon.maxUses) {
      return { valid: false, discountPercent: 0, message: 'Coupon code has reached its usage limit' };
    }
    const existing = await this.couponRepo.findRedemption(coupon.id, userId);
    if (existing) {
      return { valid: false, discountPercent: 0, message: 'You have already used this code' };
    }
    await this.couponRepo.createRedemption(coupon.id, userId);
    await this.couponRepo.incrementUsed(coupon.id);
    return {
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      message: `Coupon applied! You save ${coupon.discountPercent}%`,
    };
  }
}
