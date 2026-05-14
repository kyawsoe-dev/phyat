import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ApiKeyModule } from '../api-keys/api-key.module';
import { AnalyticsService } from '../analytics/application/analytics.service';
import { AnalyticsRepository } from '../analytics/infrastructure/analytics.repository';
import { AuthModule } from '../auth/auth.module';
import { TierLimitGuard } from '../subscriptions/tier-limit.guard';
import { LinksService } from './application/links.service';
import { RedirectService } from './application/redirect.service';
import { SlugService } from './application/slug.service';
import { LinkRepository } from './infrastructure/link.repository';
import { CacheService } from './infrastructure/cache.service';
import { LinksController } from './interfaces/links.controller';
import { ShortenApiController } from './interfaces/shorten-api.controller';

@Module({
  imports: [AuthModule, ApiKeyModule],
  controllers: [LinksController, ShortenApiController],
  providers: [
    AnalyticsRepository,
    AnalyticsService,
    CacheService,
    LinkRepository,
    LinksService,
    PrismaService,
    RedirectService,
    SlugService,
    TierLimitGuard,
  ],
})
export class LinksModule {}
