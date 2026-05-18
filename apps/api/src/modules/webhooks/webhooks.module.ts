import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { TierCapabilityService } from '../subscriptions/application/tier-capability.service';
import { UsageService } from '../subscriptions/application/usage.service';
import { WebhooksService } from './application/webhooks.service';
import { WebhooksController } from './interfaces/webhooks.controller';

@Module({
  imports: [AuthModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, TierCapabilityService, UsageService, PrismaService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
