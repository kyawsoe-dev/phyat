import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

type AnalyticsInput = {
  linkId: string;
  userAgent?: string;
  referrer?: string;
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
};

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: AnalyticsInput) {
    return this.prisma.analytics.create({ data: input });
  }

  async getById(id: string) {
    return this.prisma.analytics.findUnique({
      where: { id },
      select: {
        id: true,
        userAgent: true,
        referrer: true,
        ip: true,
        country: true,
        region: true,
        city: true,
        clickedAt: true,
        link: {
          select: {
            id: true,
            slug: true,
            title: true,
            destination: true,
            user: { select: { id: true } },
          },
        },
      },
    });
  }

  async listByLink(linkId: string, userId: string, take = 50) {
    const link = await this.prisma.link.findFirst({ where: { id: linkId, userId } });
    if (!link) return { data: [], total: 0 };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.analytics.findMany({
        where: { linkId },
        orderBy: { clickedAt: 'desc' },
        take,
        select: {
          id: true,
          userAgent: true,
          referrer: true,
          ip: true,
          country: true,
          region: true,
          city: true,
          clickedAt: true,
        },
      }),
      this.prisma.analytics.count({ where: { linkId } }),
    ]);

    return { data, total };
  }

  async getStatsByLink(linkId: string, userId: string) {
    const link = await this.prisma.link.findFirst({ where: { id: linkId, userId } });
    if (!link) return null;

    const [totalClicks, byCountry, byDevice, byReferrer, overTime, byCity] = await this.prisma.$transaction([
      this.prisma.analytics.count({ where: { linkId } }),
      this.prisma.analytics.groupBy({
        by: ['country'],
        where: { linkId },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),
      this.prisma.analytics.groupBy({
        by: ['userAgent'],
        where: { linkId, userAgent: { not: null } },
        _count: { userAgent: true },
        orderBy: { _count: { userAgent: 'desc' } },
        take: 5,
      }),
      this.prisma.analytics.groupBy({
        by: ['referrer'],
        where: { linkId },
        _count: { referrer: true },
        orderBy: { _count: { referrer: 'desc' } },
        take: 10,
      }),
      this.prisma.$queryRawUnsafe<Array<{ date: string; clicks: bigint }>>(
        `SELECT DATE(clicked_at) as date, COUNT(*)::int as clicks
         FROM analytics
         WHERE link_id = $1
         GROUP BY DATE(clicked_at)
         ORDER BY date ASC`,
        linkId,
      ),
      this.prisma.analytics.groupBy({
        by: ['city', 'country'],
        where: { linkId, city: { not: null } },
        _count: { city: true },
        orderBy: { _count: { city: 'desc' } },
        take: 10,
      }),
    ]);

    type DeviceCountResult = { userAgent: string | null; _count: { userAgent: number } };
    const deviceResults = byDevice as DeviceCountResult[];
    const mobileCount = deviceResults.reduce((sum, d) => {
      const count = d._count?.userAgent ?? 0;
      return /mobile|android|iphone/i.test(d.userAgent ?? '') ? sum + count : sum;
    }, 0);
    const desktopCount = totalClicks - mobileCount;

    return {
      totalClicks,
      byCountry,
      byDevice: { mobile: mobileCount, desktop: desktopCount },
      byReferrer,
      overTime: (overTime as Array<{ date: string; clicks: bigint }>).map((d) => ({
        date: d.date,
        clicks: Number(d.clicks),
      })),
      byCity,
    };
  }
}
