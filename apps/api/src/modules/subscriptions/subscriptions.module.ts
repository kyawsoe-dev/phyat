import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsController } from './interfaces/subscriptions.controller';
import { SubscriptionsService } from './application/subscriptions.service';
import { SubscriptionRepository } from './infrastructure/subscription.repository';
import { CouponRepository } from './infrastructure/coupon.repository';
import { TierCapabilityService } from './application/tier-capability.service';
import { UsageService } from './application/usage.service';

@Module({
  imports: [AuthModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionRepository, CouponRepository, TierCapabilityService, UsageService, PrismaService],
  exports: [SubscriptionsService, TierCapabilityService, UsageService],
})
export class SubscriptionsModule {}
