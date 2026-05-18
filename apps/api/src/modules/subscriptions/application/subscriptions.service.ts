import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BillingCycle, TierCode } from '@prisma/client';
import { PrismaService } from '../../../common/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionRepository } from '../infrastructure/subscription.repository';
import { CouponRepository } from '../infrastructure/coupon.repository';
import * as StripePackage from 'stripe';
import { TIER_SELECT } from './tier-capability.service';
import { UsageService } from './usage.service';
import type { AdminTierDto, ReorderTiersDto, UpgradeDto, CheckoutSessionDto } from './dto';

@Injectable()
export class SubscriptionsService {
  private readonly stripe: any;
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly couponRepo: CouponRepository,
    private readonly usage: UsageService,
    private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not set in environment');
    }
    const Stripe = (StripePackage as any).default ?? (StripePackage as any);
    this.stripe = new Stripe(secretKey, { apiVersion: '2026-04-22.dahlia' });
  }

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
      stripeCustomerId: sub.stripeCustomerId ?? null,
      stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
    };
  }

  getCurrentUsage(userId: string) {
    return this.usage.currentUsage(userId);
  }

  /**
   * Create a Stripe Checkout Session → returns the URL the frontend will redirect to.
   * For FREE tier there is no payment session – returns the tier data directly.
   */
  async createCheckoutSession(userId: string, userEmail: string, input: CheckoutSessionDto) {
    const tier = await this.prisma.tier.findUnique({ where: { code: input.tierCode } });
    if (!tier || !tier.isActive) throw new NotFoundException('Plan not found');

    // Validate any coupon ahead of time
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

    // Free tier – no payment needed, assign immediately
    if ((tier.priceMonthly ?? 0) === 0) {
      return { url: null, sessionId: null, immediate: true };
    }

    const basePrice = input.billingCycle === 'ANNUAL' ? tier.priceAnnual ?? 0 : tier.priceMonthly ?? 0;
    const finalPrice = basePrice - Math.round(basePrice * (discountPercent / 100));

    const priceIdKey = `STRIPE_PRICE_ID_${input.tierCode}_${input.billingCycle}`;
    const priceId = this.config.get<string>(priceIdKey);

    if (!priceId) {
      throw new BadRequestException(
        `Stripe price ID not configured for ${input.tierCode} ${input.billingCycle}. Set ${priceIdKey}.`,
      );
    }

    const appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');

    const lineItem = {
      price: priceId,
      quantity: 1,
    } as any;

    // Compute effective price in cents (price before discount)
    const session: any = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [lineItem],
      metadata: {
        userId,
        tierCode: input.tierCode,
        billingCycle: input.billingCycle,
        discountPercent: String(discountPercent),
        priceCents: String(finalPrice),
        ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      },
      customer_email: userEmail,
      success_url: `${appUrl}/dashboard/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/plans?checkout=cancelled`,
    });

    return { url: session.url ?? null, sessionId: session.id, immediate: false };
  }

  /**
   * Sync a completed Stripe checkout session into our DB.
   * Called from the webhook handler after `checkout.session.completed`.
   */
  async syncSubscriptionFromSession(sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!session.metadata) {
      this.logger.warn(`Session ${sessionId} has no metadata – skipping`);
      return;
    }

    const userId = session.metadata.userId as string;
    const tierCode = session.metadata.tierCode as string;
    const billingCycle = session.metadata.billingCycle as 'MONTHLY' | 'ANNUAL';

    if (!userId || !tierCode) {
      this.logger.warn(`Session ${sessionId} missing userId or tierCode in metadata`);
      return;
    }

    const tier = await this.prisma.tier.findUnique({
      where: { code: tierCode as any },
    });
    if (!tier) {
      this.logger.error(`Tier ${tierCode} not found for session ${sessionId}`);
      return;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'ANNUAL') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Remove existing active subscriptions and create the new one
    await this.prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELED', canceledAt: now },
    });

    await this.prisma.subscription.create({
      data: {
        userId,
        tierId: tier.id,
        status: 'ACTIVE',
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
      },
      include: { tier: true },
    });

    await this.prisma.user.update({ where: { id: userId }, data: { tierId: tier.id } });

    // If the coupon code was metadata, create the redemption
    const couponCode = session.metadata.couponCode as string | undefined;
    if (couponCode) {
      const coupon = await this.couponRepo.findByCode(couponCode);
      if (coupon) {
        const existing = await this.couponRepo.findRedemption(coupon.id, userId);
        if (!existing) {
          await this.couponRepo.createRedemption(coupon.id, userId);
          await this.couponRepo.incrementUsed(coupon.id);
        }
      }
    }

    this.logger.log(`Synced Stripe subscription for user ${userId}: ${tierCode} ${billingCycle}`);
  }

  /**
   * Free/DB-only upgrade (no payment required). Kept for backward compatibility.
   */
  async upgrade(userId: string, input: UpgradeDto) {
    if (input.tierCode !== 'FREE') {
      const tier = await this.prisma.tier.findUnique({ where: { code: input.tierCode } });
      if (!tier || (tier.priceMonthly ?? 0) > 0 || (tier?.priceAnnual ?? 0) > 0) {
        throw new BadRequestException(
          `Upgrading to "${tier!.name}" requires payment. Use /subscriptions/checkout to start payment.`,
        );
      }
    }

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

    // Cancel in Stripe if we have a subscription ID
    if (sub.stripeSubscriptionId) {
      try {
        await this.stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      } catch (err: any) {
        this.logger.warn(`Failed to cancel Stripe sub ${sub.stripeSubscriptionId}: ${err.message}`);
      }
    }

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
