import { Controller, Headers, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from '../application/subscriptions.service';
import { PrismaService } from '../../../common/prisma.service';
import { StripeService } from './stripe.service';

@ApiTags('stripe')
@Controller()
export class StripeWebhooksController {
  private readonly logger = new Logger(StripeWebhooksController.name);

  constructor(
    private readonly subsService: SubscriptionsService,
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint for Checkout and subscription events' })
  @ApiHeader({ name: 'Stripe-Signature', description: 'Stripe webhook signature for verification', required: true })
  async handleWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    if (!signature || !request.rawBody) {
      this.logger.warn('Stripe webhook received without signature or raw body.');
      return { received: false };
    }

    let event: any;
    try {
      event = this.stripe.constructWebhookEvent(request.rawBody, signature);
      this.logger.log(`Stripe webhook received: ${event.type} id=${event.id}`);
    } catch (error) {
      this.logger.error(`Stripe webhook signature verification failed: ${String(error)}`);
      return { received: false };
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.subsService.syncSubscriptionFromSession(event.data.object.id);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'invoice.payment_failed':
          this.logger.warn(`Stripe invoice payment failed: ${event.data.object.id}`);
          break;
        default:
          this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing Stripe event ${event.type}: ${String(error)}`);
      throw error;
    }

    return { received: true };
  }

  private async handleSubscriptionDeleted(subscription: any) {
    const stripeSubscriptionId = subscription.id as string | undefined;
    if (!stripeSubscriptionId) return;
    const updated = await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId, status: 'ACTIVE' },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
    if (updated.count > 0) this.logger.log(`Marked subscription ${stripeSubscriptionId} canceled.`);
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const stripeSubscriptionId = subscription.id as string | undefined;
    if (!stripeSubscriptionId) return;
    if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
      await this.handleSubscriptionDeleted(subscription);
    }
  }
}
