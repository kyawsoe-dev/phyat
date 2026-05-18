import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StripePackage from 'stripe';

@Injectable()
export class StripeService {
  private stripeClient?: any;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly config: ConfigService) {}

  getStripe(): any {
    if (this.stripeClient) return this.stripeClient;
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not set. Configure Stripe before starting paid checkout.');
    }
    this.assertLooksLikeStripeSecret(secretKey);
    const StripeCtor = (StripePackage as any).default ?? (StripePackage as any);
    this.stripeClient = new StripeCtor(secretKey);
    return this.stripeClient;
  }

  getWebhookSecret(): string {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET is not set. Configure it before receiving Stripe webhooks.');
    }
    return secret;
  }

  getPriceId(tierCode: string, billingCycle: 'MONTHLY' | 'ANNUAL') {
    const key = `STRIPE_PRICE_ID_${tierCode}_${billingCycle}`;
    const priceId = this.config.get<string>(key);
    if (!priceId || priceId.includes('your_') || !priceId.startsWith('price_')) {
      throw new BadRequestException(`Stripe price ID is missing or invalid for ${tierCode} ${billingCycle}. Set ${key} to a real Stripe recurring Price ID that starts with price_.`);
    }
    return priceId;
  }

  private assertLooksLikeStripeSecret(secretKey: string) {
    if (secretKey.includes('your_') || !/^sk_(test|live)_/.test(secretKey)) {
      throw new BadRequestException('STRIPE_SECRET_KEY is missing or invalid. Use a real Stripe key that starts with sk_test_ or sk_live_.');
    }
  }

  async createLocalCouponDiscount(percentOff: number, code: string) {
    if (percentOff <= 0) return undefined;
    const coupon = await this.getStripe().coupons.create({
      percent_off: percentOff,
      duration: 'once',
      name: `Phyat ${code}`,
      metadata: { source: 'phyat-local-coupon', code },
    });
    return { coupon: coupon.id };
  }

  async createCheckoutSession(params: {
    tierCode: 'PRO' | 'DEVELOPER';
    billingCycle: 'MONTHLY' | 'ANNUAL';
    userId: string;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
    localCoupon?: { code: string; discountPercent: number };
  }): Promise<{ url: string | null; sessionId: string | null }> {
    const priceId = this.getPriceId(params.tierCode, params.billingCycle);
    const discount = params.localCoupon
      ? await this.createLocalCouponDiscount(params.localCoupon.discountPercent, params.localCoupon.code)
      : undefined;

    this.logger.log(`Creating Stripe Checkout session for user ${params.userId}: ${params.tierCode} ${params.billingCycle}`);

    const session = await this.getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.userEmail,
      client_reference_id: params.userId,
      allow_promotion_codes: discount ? undefined : true,
      discounts: discount ? [discount] : undefined,
      metadata: {
        userId: params.userId,
        tierCode: params.tierCode,
        billingCycle: params.billingCycle,
        ...(params.localCoupon ? { couponCode: params.localCoupon.code } : {}),
      },
      subscription_data: {
        metadata: {
          userId: params.userId,
          tierCode: params.tierCode,
          billingCycle: params.billingCycle,
          ...(params.localCoupon ? { couponCode: params.localCoupon.code } : {}),
        },
      },
    });

    return { url: session.url ?? null, sessionId: session.id };
  }

  constructWebhookEvent(rawBody: Buffer | string, signature: string) {
    return this.getStripe().webhooks.constructEvent(rawBody, signature, this.getWebhookSecret());
  }

  retrieveCheckoutSession(sessionId: string) {
    return this.getStripe().checkout.sessions.retrieve(sessionId, { expand: ['subscription', 'customer'] });
  }

  cancelSubscription(stripeSubscriptionId: string) {
    return this.getStripe().subscriptions.cancel(stripeSubscriptionId);
  }
}
