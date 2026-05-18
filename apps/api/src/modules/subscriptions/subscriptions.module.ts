import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsController } from './interfaces/subscriptions.controller';
import { StripeWebhooksController } from './infrastructure/stripe.webhooks.controller';
import { SubscriptionsService } from './application/subscriptions.service';
import { SubscriptionRepository } from './infrastructure/subscription.repository';
import { CouponRepository } from './infrastructure/coupon.repository';
import { TierCapabilityService } from './application/tier-capability.service';
import { UsageService } from './application/usage.service';
import { StripeService } from './infrastructure/stripe.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [SubscriptionsController, StripeWebhooksController],
  providers: [
    SubscriptionsService,
    SubscriptionRepository,
    CouponRepository,
    TierCapabilityService,
    UsageService,
    PrismaService,
    StripeService,
  ],
  exports: [SubscriptionsService, TierCapabilityService, UsageService],
})
export class SubscriptionsModule {}
