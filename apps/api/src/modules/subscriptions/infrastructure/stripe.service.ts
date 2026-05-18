import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as StripePackage from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private readonly stripe: any;
  private readonly logger = new Logger(StripeService.name);
  private readonly priceMap: Record<string, { tierCode: string; billingCycle: 'MONTHLY' | 'ANNUAL' }>;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not set in environment');
    }
    const Stripe = (StripePackage as any).default ?? (StripePackage as any);
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-04-22.dahlia',
    });

    // Map env price IDs to tier config
    this.priceMap = {
      [this.config.get<string>('STRIPE_PRICE_ID_PRO_MONTHLY')!]:    { tierCode: 'PRO',        billingCycle: 'MONTHLY' },
      [this.config.get<string>('STRIPE_PRICE_ID_PRO_ANNUAL')!]:      { tierCode: 'PRO',        billingCycle: 'ANNUAL'   },
      [this.config.get<string>('STRIPE_PRICE_ID_DEVELOPER_MONTHLY')!]: { tierCode: 'DEVELOPER', billingCycle: 'MONTHLY' },
      [this.config.get<string>('STRIPE_PRICE_ID_DEVELOPER_ANNUAL')!]:   { tierCode: 'DEVELOPER', billingCycle: 'ANNUAL'   },
    };
    // Filter out empty / unset keys
    Object.keys(this.priceMap).forEach((key) => {
      if (!key) delete this.priceMap[key];
    });
  }

  async createCheckoutSession(params: {
    tierCode: string;
    billingCycle: 'MONTHLY' | 'ANNUAL';
    userId: string;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
    couponCode?: string;
    discountPercent?: number;
  }): Promise<{ url: string | null; sessionId: string | null }> {
    if (params.tierCode === 'FREE') {
      return { url: null, sessionId: null };
    }

    const priceIdKey = `STRIPE_PRICE_ID_${params.tierCode}_${params.billingCycle}`;
    const priceId = this.config.get<string>(priceIdKey);

    if (!priceId) {
      throw new BadRequestException(
        `No Stripe price ID configured for tier "${params.tierCode}" ${params.billingCycle}. ` +
        `Set ${priceIdKey} in environment variables.`,
      );
    }

    const sessionMetadata: Record<string, string> = {
      userId: params.userId,
      tierCode: params.tierCode,
      billingCycle: params.billingCycle,
    };

    if (params.couponCode) sessionMetadata.couponCode = params.couponCode;
    if (params.discountPercent !== undefined) sessionMetadata.discountPercent = String(params.discountPercent);

    this.logger.log(`Creating Stripe checkout session for user ${params.userId} → tier ${params.tierCode} ${params.billingCycle}`);

    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: sessionMetadata,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.userEmail,
      allow_promotion_codes: true,
    };

    if (params.couponCode) {
      sessionParams.discounts = [{ coupon: params.couponCode }];
    }

    const session: any = await this.stripe.checkout.sessions.create(sessionParams);
    this.logger.log(`Stripe checkout session created: ${session.id}`);

    return { url: session.url ?? null, sessionId: session.id };
  }

  async handleCheckoutSessionCompleted(session: any): Promise<void> {
    const metadata = session.metadata ?? {};
    const userId = metadata.userId ?? '';
    const tierCode = metadata.tierCode ?? '';

    if (!userId || !tierCode) {
      this.logger.warn(`Checkout session ${session.id} has no user/tier metadata – skipping DB sync`);
      return;
    }

    this.logger.log(`Webhook: checkout.session.completed → user=${userId} tier=${tierCode}`);
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.del(stripeSubscriptionId);
      this.logger.log(`Cancelled Stripe subscription ${stripeSubscriptionId}`);
    } catch (err: any) {
      this.logger.error(`Failed to cancel Stripe subscription ${stripeSubscriptionId}: ${err.message}`);
      throw err;
    }
  }

  async findCustomerByEmail(email: string): Promise<any> {
    const customers = await this.stripe.customers.list({ email, limit: 1 });
    return customers.data[0] ?? null;
  }

  async ensureCustomer(userId: string, userEmail: string, userName?: string): Promise<string> {
    const existing = await this.findCustomerByEmail(userEmail);
    if (existing) return existing.id;

    const customer = await this.stripe.customers.create({
      email: userEmail,
      name: userName ?? undefined,
      metadata: { userId },
    });
    return customer.id;
  }

  getStripe(): any {
    return this.stripe;
  }
}
