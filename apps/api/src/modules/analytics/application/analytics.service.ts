import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AnalyticsEventType } from '@prisma/client';
import { AnalyticsRepository } from '../infrastructure/analytics.repository';
import { ClickContext } from '../../links/application/dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly analytics: AnalyticsRepository) {}

  trackClick(linkId: string, context: ClickContext, eventType: AnalyticsEventType = 'CLICK'): void {
    const location = this.mockGeoIp(context.ip);
    const agent = this.parseUserAgent(context.userAgent);
    const referrerDomain = this.referrerDomain(context.referrer);

    void this.analytics
      .create({
        linkId,
        eventType,
        userAgent: context.userAgent,
        ...agent,
        referrer: context.referrer,
        referrerDomain,
        ip: context.ip,
        ...location,
      })
      .catch((error: unknown) => {
        this.logger.warn(`Analytics write failed for link ${linkId}: ${String(error)}`);
      });
  }

  async getClicks(linkId: string, userId: string) {
    const result = await this.analytics.listByLink(linkId, userId);
    if (result.total === 0) return { data: [], total: 0 };
    return result;
  }

  async getStats(linkId: string, userId: string) {
    const stats = await this.analytics.getStatsByLink(linkId, userId);
    if (!stats) throw new NotFoundException('Link not found or access denied.');
    return stats;
  }

  private parseUserAgent(userAgent?: string) {
    const ua = userAgent ?? '';
    const device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop';
    const browser = /edg/i.test(ua) ? 'Edge' : /chrome/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : /firefox/i.test(ua) ? 'Firefox' : 'Unknown';
    const os = /windows/i.test(ua) ? 'Windows' : /mac os|macintosh/i.test(ua) ? 'macOS' : /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : /linux/i.test(ua) ? 'Linux' : 'Unknown';
    return { browser, os, device };
  }

  private referrerDomain(referrer?: string) {
    if (!referrer) return undefined;
    try {
      return new URL(referrer).hostname;
    } catch {
      return undefined;
    }
  }

  private mockGeoIp(ip?: string) {
    if (!ip) {
      return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
    }

    return {
      country: ip.startsWith('192.') || ip.startsWith('10.') ? 'MM' : 'US',
      region: ip.startsWith('192.') || ip.startsWith('10.') ? 'Yangon' : 'California',
      city: ip.startsWith('192.') || ip.startsWith('10.') ? 'Yangon' : 'San Francisco',
    };
  }
}
