import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsController } from './interfaces/subscriptions.controller';
import { SubscriptionsService } from './application/subscriptions.service';
import { SubscriptionRepository } from './infrastructure/subscription.repository';
import { CouponRepository } from './infrastructure/coupon.repository';

@Module({
  imports: [AuthModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionRepository, CouponRepository, PrismaService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
