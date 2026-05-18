import { GoneException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ClickContext } from './dto';
import { AnalyticsService } from '../../analytics/application/analytics.service';
import { LinkRepository } from '../infrastructure/link.repository';
import { CacheService } from '../infrastructure/cache.service';
import { isRedirectable, normalizeSlug } from '../domain/link-policy';
import { WebhooksService } from '../../webhooks/application/webhooks.service';

export type RedirectResult = {
  destination: string;
  statusCode: 302 | 301;
};

@Injectable()
export class RedirectService {
  private readonly logger = new Logger(RedirectService.name);

  constructor(
    private readonly links: LinkRepository,
    private readonly analytics: AnalyticsService,
    private readonly cache: CacheService,
    private readonly webhooks: WebhooksService,
  ) {}

  async resolve(slug: string, context: ClickContext, password?: string, shortHost?: string): Promise<RedirectResult> {
    const normalized = normalizeSlug(slug);
    const cacheKey = this.cacheKey(shortHost, normalized);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return this.resolveFromCache(cached, cacheKey, context, password);
    }

    const link = await this.links.findBySlug(normalized, shortHost);

    if (!link) {
      throw new NotFoundException('Link not found.');
    }

    if (!isRedirectable(link)) {
      throw new GoneException('This link has expired or is disabled.');
    }

    this.cache.set(cacheKey, {
      id: link.id,
      userId: link.userId,
      destination: link.destination,
      passwordHash: link.passwordHash,
      status: link.status,
      expiresAt: link.expiresAt,
      archivedAt: link.archivedAt,
      redirectType: link.redirectType,
    });

    if (link.passwordHash) {
      const ok = password ? await bcrypt.compare(password, link.passwordHash) : false;
      if (!ok) {
        throw new UnauthorizedException('Password required.');
      }
    }

    this.analytics.trackClick(link.id, context, 'CLICK');
    void this.links.incrementClickCount(link.id).catch((error: unknown) => {
      this.logger.warn(`Click count update failed for link ${link.id}: ${String(error)}`);
    });
    void this.webhooks.publish(link.userId, 'LINK_CLICKED', { id: link.id, slug: link.slug, shortHost: link.shortHost });

    return { destination: link.destination, statusCode: link.redirectType === 'PERMANENT' ? 301 : 302 };
  }

  private resolveFromCache(
    cached: { id: string; userId?: string; destination: string; passwordHash: string | null; status: string; expiresAt: Date | null; archivedAt?: Date | null; redirectType?: string },
    slug: string,
    context: ClickContext,
    password?: string,
  ): RedirectResult {
    const now = new Date();

    if (cached.expiresAt && cached.expiresAt <= now) {
      this.cache.invalidate(slug);
      throw new GoneException('This link has expired or is disabled.');
    }

    if (cached.archivedAt) {
      throw new GoneException('This link has expired or is disabled.');
    }

    if (cached.status !== 'ACTIVE') {
      throw new GoneException('This link has expired or is disabled.');
    }

    if (cached.passwordHash) {
      const ok = password ? bcrypt.compareSync(password, cached.passwordHash) : false;
      if (!ok) {
        throw new UnauthorizedException('Password required.');
      }
    }

    this.analytics.trackClick(cached.id, context, 'CLICK');
    void this.links.incrementClickCount(cached.id).catch((error: unknown) => {
      this.logger.warn(`Click count update failed for link ${cached.id}: ${String(error)}`);
    });
    if (cached.userId) void this.webhooks.publish(cached.userId, 'LINK_CLICKED', { id: cached.id });

    return { destination: cached.destination, statusCode: cached.redirectType === 'PERMANENT' ? 301 : 302 };
  }

  private cacheKey(shortHost: string | undefined, slug: string) {
    return shortHost ? `${shortHost}/${slug}` : slug;
  }
}
