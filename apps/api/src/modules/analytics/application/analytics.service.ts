import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AnalyticsRepository } from '../infrastructure/analytics.repository';
import { ClickContext } from '../../links/application/dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly analytics: AnalyticsRepository) {}

  trackClick(linkId: string, context: ClickContext): void {
    const location = this.mockGeoIp(context.ip);

    void this.analytics
      .create({
        linkId,
        userAgent: context.userAgent,
        referrer: context.referrer,
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
