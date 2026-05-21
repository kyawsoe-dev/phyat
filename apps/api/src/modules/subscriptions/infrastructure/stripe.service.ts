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
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not set. Configure Stripe before using Stripe features.');
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

  private assertLooksLikeStripeSecret(secretKey: string) {
    if (secretKey.includes('your_') || !/^sk_(test|live)_/.test(secretKey)) {
      throw new BadRequestException('STRIPE_SECRET_KEY is missing or invalid. Use a real Stripe key that starts with sk_test_ or sk_live_.');
    }
  }

  constructWebhookEvent(rawBody: Buffer | string, signature: string) {
    return this.getStripe().webhooks.constructEvent(rawBody, signature, this.getWebhookSecret());
  }

  cancelSubscription(stripeSubscriptionId: string) {
    return this.getStripe().subscriptions.cancel(stripeSubscriptionId);
  }
}
