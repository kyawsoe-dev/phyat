import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import * as StripePackage from 'stripe';
import { SubscriptionsService } from '../application/subscriptions.service';
import { PrismaService } from '../../../common/prisma.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('stripe')
@Controller()
export class StripeWebhooksController {
  private readonly stripe: any;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(StripeWebhooksController.name);

  constructor(
    private readonly subsService: SubscriptionsService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const secretKey = config.get<string>('STRIPE_SECRET_KEY')!;
    const Stripe = (StripePackage as any).default ?? (StripePackage as any);
    this.stripe = new Stripe(secretKey, { apiVersion: '2026-04-22.dahlia' });
    this.webhookSecret = config.get<string>('STRIPE_WEBHOOK_SECRET')!;
  }

  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint – handles checkout.completed and invoice.paid events' })
  @ApiHeader({ name: 'Stripe-Signature', description: 'Stripe webhook signature for verification', required: true })
  async handleWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Body() body: any,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      this.logger.warn('Webhook received without Stripe-Signature header – skipping');
      return { received: false };
    }

    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        JSON.stringify(body),
        signature,
        this.webhookSecret,
      ) as unknown as any;
      this.logger.log(`Stripe webhook received: ${event.type} – id=${event.id}`);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      return { received: false };
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.subsService.syncSubscriptionFromSession(event.data.object.id);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as any);
          break;

        case 'invoice.payment_failed':
          this.logger.warn(`Payment failed for invoice ${event.data.object.id}`);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as any);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as any);
          break;

        default:
          this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (err: any) {
      this.logger.error(`Error processing Stripe event ${event.type}: ${err.message}`);
    }

    return { received: true };
  }

  private async handleInvoicePaid(invoice: any) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;
    this.logger.log(`Invoice paid by customer ${customerId} – invoice=${invoice.id}`);
  }

  private async handleSubscriptionDeleted(sub: any) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (!customerId) return;
    const updated = await this.prisma.subscription.updateMany({
      where: { stripeCustomerId: customerId, status: 'ACTIVE' },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
    if (updated.count > 0) {
      this.logger.log(`Cancelled ${updated.count} database subscription(s) for Stripe customer ${customerId}`);
    }
  }

  private async handleSubscriptionUpdated(sub: any) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (!customerId) return;
    if (sub.status === 'canceled' || sub.status === 'unpaid') {
      const updated = await this.prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: { status: 'CANCELED', canceledAt: new Date() },
      });
      this.logger.log(`Marked ${updated.count} subscription(s) CANCELED for Stripe sub ${sub.id} (${sub.status})`);
    }
  }
}
