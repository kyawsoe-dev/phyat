import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ApiKeyModule } from '../api-keys/api-key.module';
import { TierCapabilityService } from '../subscriptions/application/tier-capability.service';
import { UsageService } from '../subscriptions/application/usage.service';
import { WebhookAuthGuard } from './application/webhook-auth.guard';
import { WebhooksService } from './application/webhooks.service';
import { WebhooksController } from './interfaces/webhooks.controller';

@Module({
  imports: [AuthModule, ApiKeyModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookAuthGuard, TierCapabilityService, UsageService, PrismaService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
