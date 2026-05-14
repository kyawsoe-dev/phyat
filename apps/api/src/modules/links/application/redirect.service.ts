import { GoneException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ClickContext } from './dto';
import { AnalyticsService } from '../../analytics/application/analytics.service';
import { LinkRepository } from '../infrastructure/link.repository';
import { CacheService } from '../infrastructure/cache.service';
import { isRedirectable, normalizeSlug } from '../domain/link-policy';
import type { Link } from '@prisma/client';

export type RedirectResult = {
  destination: string;
  statusCode: 302;
};

@Injectable()
export class RedirectService {
  private readonly logger = new Logger(RedirectService.name);

  constructor(
    private readonly links: LinkRepository,
    private readonly analytics: AnalyticsService,
    private readonly cache: CacheService,
  ) {}

  async resolve(slug: string, context: ClickContext, password?: string): Promise<RedirectResult> {
    const normalized = normalizeSlug(slug);
    const cached = this.cache.get(normalized);

    if (cached) {
      return this.resolveFromCache(cached, normalized, context, password);
    }

    const link = await this.links.findBySlug(normalized);

    if (!link) {
      throw new NotFoundException('Link not found.');
    }

    if (!isRedirectable(link)) {
      throw new GoneException('This link has expired or is disabled.');
    }

    this.cache.set(normalized, {
      id: link.id,
      destination: link.destination,
      passwordHash: link.passwordHash,
      status: link.status,
      expiresAt: link.expiresAt,
    });

    if (link.passwordHash) {
      const ok = password ? await bcrypt.compare(password, link.passwordHash) : false;
      if (!ok) {
        throw new UnauthorizedException('Password required.');
      }
    }

    this.analytics.trackClick(link.id, context);
    void this.links.incrementClickCount(link.id).catch((error: unknown) => {
      this.logger.warn(`Click count update failed for link ${link.id}: ${String(error)}`);
    });

    return { destination: link.destination, statusCode: 302 };
  }

  private resolveFromCache(
    cached: { id: string; destination: string; passwordHash: string | null; status: string; expiresAt: Date | null },
    slug: string,
    context: ClickContext,
    password?: string,
  ): RedirectResult {
    const now = new Date();

    if (cached.expiresAt && cached.expiresAt <= now) {
      this.cache.invalidate(slug);
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

    this.analytics.trackClick(cached.id, context);
    void this.links.incrementClickCount(cached.id).catch((error: unknown) => {
      this.logger.warn(`Click count update failed for link ${cached.id}: ${String(error)}`);
    });

    return { destination: cached.destination, statusCode: 302 };
  }
}
