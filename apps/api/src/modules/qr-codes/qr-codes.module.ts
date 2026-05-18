import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AnalyticsService } from '../analytics/application/analytics.service';
import { AnalyticsRepository } from '../analytics/infrastructure/analytics.repository';
import { AuthModule } from '../auth/auth.module';
import { TierCapabilityService } from '../subscriptions/application/tier-capability.service';
import { UsageService } from '../subscriptions/application/usage.service';
import { WebhooksService } from '../webhooks/application/webhooks.service';
import { QrCodesService } from './application/qr-codes.service';
import { QrCodesController } from './interfaces/qr-codes.controller';

@Module({
  imports: [AuthModule],
  controllers: [QrCodesController],
  providers: [QrCodesService, AnalyticsService, AnalyticsRepository, TierCapabilityService, UsageService, WebhooksService, PrismaService],
})
export class QrCodesModule {}
