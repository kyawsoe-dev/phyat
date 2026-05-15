import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from '../application/dto';

@Injectable()
export class CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        clickGoal: input.clickGoal,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
    });
  }

  async listByUser(userId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { links: true } },
      },
    });

    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const totalClicks = await this.prisma.analytics.count({
          where: { link: { campaignId: c.id } },
        });
        return {
          id: c.id,
          userId: c.userId,
          name: c.name,
          description: c.description,
          clickGoal: c.clickGoal,
          startDate: c.startDate,
          endDate: c.endDate,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          linkCount: c._count.links,
          totalClicks,
        };
      }),
    );

    return enriched;
  }

  async findById(id: string, userId: string) {
    return this.prisma.campaign.findFirst({
      where: { id, userId },
    });
  }

  async update(id: string, userId: string, input: UpdateCampaignDto) {
    return this.prisma.campaign.updateMany({
      where: { id, userId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.clickGoal !== undefined && { clickGoal: input.clickGoal }),
        ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
        ...(input.endDate !== undefined && { endDate: new Date(input.endDate) }),
      },
    });
  }

  async delete(id: string, userId: string) {
    return this.prisma.campaign.deleteMany({
      where: { id, userId },
    });
  }

  async listLinks(campaignId: string, userId: string) {
    return this.prisma.link.findMany({
      where: { campaignId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAggregatedStats(campaignId: string, userId: string) {
    const linkFilter = { link: { campaignId, userId } };

    const [totalClicks, byCountry, byDevice, byReferrer, byCity, rawOverTime] =
      await this.prisma.$transaction([
        this.prisma.analytics.count({ where: linkFilter }),
        this.prisma.analytics.groupBy({
          by: ['country'],
          where: linkFilter,
          _count: { country: true },
          orderBy: { _count: { country: 'desc' } },
          take: 10,
        }),
        this.prisma.analytics.groupBy({
          by: ['userAgent'],
          where: { ...linkFilter, userAgent: { not: null } },
          _count: { userAgent: true },
          orderBy: { _count: { userAgent: 'desc' } },
          take: 5,
        }),
        this.prisma.analytics.groupBy({
          by: ['referrer'],
          where: { ...linkFilter, referrer: { not: null } },
          _count: { referrer: true },
          orderBy: { _count: { referrer: 'desc' } },
          take: 10,
        }),
        this.prisma.analytics.groupBy({
          by: ['city', 'country'],
          where: { ...linkFilter, city: { not: null } },
          _count: { city: true },
          orderBy: { _count: { city: 'desc' } },
          take: 10,
        }),
        this.prisma.$queryRawUnsafe<
          Array<{ date: string; clicks: number }>
        >(
          `SELECT DATE(a.clicked_at) AS date, COUNT(*)::int AS clicks
           FROM analytics a
           JOIN links l ON l.id = a.link_id
           WHERE l.campaign_id = $1 AND l.user_id = $2
           GROUP BY DATE(a.clicked_at)
           ORDER BY date ASC`,
          campaignId,
          userId,
        ),
      ]);

    type DeviceResult = { userAgent: string | null; _count: { userAgent: number } };
    const deviceResults = byDevice as DeviceResult[];
    const mobileCount = deviceResults.reduce((sum, d) => {
      const count = d._count?.userAgent ?? 0;
      return /mobile|android|iphone/i.test(d.userAgent ?? '') ? sum + count : sum;
    }, 0);

    return {
      totalClicks,
      byCountry,
      byDevice: { mobile: mobileCount, desktop: totalClicks - mobileCount },
      byReferrer,
      byCity,
      overTime: rawOverTime.map((r) => ({
        date: r.date,
        clicks: Number(r.clicks),
      })),
    };
  }

  async assignLink(campaignId: string, linkId: string, userId: string) {
    return this.prisma.link.updateMany({
      where: { id: linkId, userId, campaignId: null },
      data: { campaignId },
    });
  }

  async unassignLink(campaignId: string, linkId: string, userId: string) {
    return this.prisma.link.updateMany({
      where: { id: linkId, userId, campaignId },
      data: { campaignId: null },
    });
  }
}
