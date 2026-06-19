import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../api-keys/api-key.module';
import { AnalyticsService } from '../analytics/application/analytics.service';
import { AnalyticsRepository } from '../analytics/infrastructure/analytics.repository';
import { AuthModule } from '../auth/auth.module';
import { DomainsModule } from '../domains/domains.module';
import { TierLimitGuard } from '../subscriptions/tier-limit.guard';
import { TierCapabilityService } from '../subscriptions/application/tier-capability.service';
import { UsageService } from '../subscriptions/application/usage.service';
import { WebhooksService } from '../webhooks/application/webhooks.service';
import { LinksService } from './application/links.service';
import { RedirectService } from './application/redirect.service';
import { SlugService } from './application/slug.service';
import { LinkRepository } from './infrastructure/link.repository';
import { CacheService } from './infrastructure/cache.service';
import { LinksController } from './interfaces/links.controller';
import { ShortenApiController } from './interfaces/shorten-api.controller';

@Module({
  imports: [AuthModule, ApiKeyModule, DomainsModule],
  controllers: [LinksController, ShortenApiController],
  providers: [
    AnalyticsRepository,
    AnalyticsService,
    CacheService,
    LinkRepository,
    LinksService,
    RedirectService,
    SlugService,
    TierLimitGuard,
    TierCapabilityService,
    UsageService,
    WebhooksService,
  ],
})
export class LinksModule {}
