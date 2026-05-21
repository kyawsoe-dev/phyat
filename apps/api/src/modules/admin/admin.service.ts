import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TierCode, UsageFeature } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { Admin2faService } from './admin-2fa.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly twofa: Admin2faService,
  ) {}

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalUsers, totalLinks, totalClicks, usersThisMonth, linksThisMonth, clicksToday, tierDistribution, recentUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.link.count(),
      this.prisma.analytics.count({ where: { eventType: 'CLICK' } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.link.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.analytics.count({ where: { eventType: 'CLICK', clickedAt: { gte: startOfToday } } }),
      this.prisma.user.groupBy({ by: ['tierId'], _count: true }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, createdAt: true, tier: { select: { name: true, code: true } } },
      }),
    ]);

    const tiers = await this.prisma.tier.findMany({ select: { id: true, name: true, code: true } });
    const tierMap = Object.fromEntries(tiers.map((t) => [t.id, t.name]));

    return {
      totalUsers,
      totalLinks,
      totalClicks,
      usersThisMonth,
      linksThisMonth,
      clicksToday,
      tierDistribution: tierDistribution.map((t) => ({
        tier: tierMap[t.tierId] ?? 'Unknown',
        count: t._count,
      })),
      recentUsers,
    };
  }

  async getSystemHealth() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [activeLinks, failedDeliveries, apiCalls, linksCreated] = await Promise.all([
      this.prisma.link.count({ where: { status: 'ACTIVE' } }),
      this.prisma.webhookDelivery.count({ where: { status: 'FAILED', createdAt: { gte: oneHourAgo } } }),
      this.prisma.usageCounter.aggregate({ where: { feature: 'API_CALLS', month: { gte: oneHourAgo } }, _sum: { count: true } }),
      this.prisma.link.count({ where: { createdAt: { gte: oneHourAgo } } }),
    ]);

    return {
      activeLinks,
      failedDeliveriesLastHour: failedDeliveries,
      apiCallsLastHour: apiCalls._sum.count ?? 0,
      linksCreatedLastHour: linksCreated,
    };
  }

  async get2faSetup(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, admin2faSecret: true, admin2faEnabled: true },
    });

    if (user.admin2faEnabled) {
      throw new ForbiddenException('2FA is already enabled. Disable it first to reconfigure.');
    }

    const secret = user.admin2faSecret ?? this.twofa.generateSecret(user.email).secret;

    if (!user.admin2faSecret) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { admin2faSecret: secret },
      });
    }

    const otpauthUrl = `otpauth://totp/Phyat%20Admin%20(${encodeURIComponent(user.email)})?secret=${secret}&issuer=Phyat&algorithm=SHA1&digits=6&period=30`;

    return { secret, otpauthUrl };
  }

  async verify2faSetup(userId: string, token: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { admin2faSecret: true, admin2faEnabled: true },
    });

    if (!user.admin2faSecret) {
      throw new ForbiddenException('2FA has not been set up yet.');
    }

    if (user.admin2faEnabled) {
      throw new ForbiddenException('2FA is already enabled.');
    }

    const isValid = this.twofa.verifyToken(token, user.admin2faSecret);
    if (!isValid) {
      throw new ForbiddenException('Invalid verification code.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { admin2faEnabled: true },
    });

    return { success: true };
  }

  async verify2faLogin(userId: string, token: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { admin2faSecret: true, admin2faEnabled: true },
    });

    if (!user.admin2faEnabled || !user.admin2faSecret) {
      throw new ForbiddenException('2FA is not enabled for this account.');
    }

    const isValid = this.twofa.verifyToken(token, user.admin2faSecret);
    if (!isValid) {
      throw new ForbiddenException('Invalid verification code.');
    }

    const twofaToken = await this.jwt.signAsync({
      sub: userId,
      type: 'admin_2fa',
    });

    return { twofaToken };
  }

  async disable2fa(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user.passwordHash) {
      throw new ForbiddenException('Password sign-in is not enabled for this account.');
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new ForbiddenException('Invalid password.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { admin2faSecret: null, admin2faEnabled: false },
    });

    return { success: true };
  }

  async getUsers(page: number, limit: number, search?: string, tier?: string) {
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tier) {
      where.tier = { code: tier as TierCode };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          createdAt: true,
          tier: { select: { code: true, name: true } },
          _count: { select: { links: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
        tier: u.tier,
        linkCount: u._count.links,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        googleId: true,
        createdAt: true,
        updatedAt: true,
        tier: { select: { code: true, name: true } },
        _count: {
          select: {
            links: true,
            campaigns: true,
            domains: true,
            apiKeys: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      ...user,
      linkCount: user._count.links,
      campaignCount: user._count.campaigns,
      domainCount: user._count.domains,
      apiKeyCount: user._count.apiKeys,
      subscriptionCount: user._count.subscriptions,
    };
  }

  async updateUser(id: string, data: { name?: string; tierCode?: string; isAdmin?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;

    if (data.tierCode) {
      const tier = await this.prisma.tier.findUnique({ where: { code: data.tierCode as TierCode } });
      if (!tier) {
        throw new NotFoundException('Tier not found.');
      }
      updateData.tierId = tier.id;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, isAdmin: true, tier: { select: { code: true, name: true } } },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  async deleteLinkById(id: string) {
    const link = await this.prisma.link.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException('Link not found.');
    }

    await this.prisma.link.delete({ where: { id } });
    return { success: true };
  }

  async getAllLinks(page: number, limit: number, search?: string) {
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { destination: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [links, total] = await Promise.all([
      this.prisma.link.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
          _count: { select: { analytics: true } },
        },
      }),
      this.prisma.link.count({ where }),
    ]);

    return {
      links: links.map((l) => ({
        id: l.id,
        slug: l.slug,
        destination: l.destination,
        title: l.title,
        status: l.status,
        clickCount: l.clickCount,
        scanCount: l.scanCount,
        createdAt: l.createdAt,
        user: l.user,
        analyticsCount: l._count.analytics,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminAnalytics(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [clicks, scans, topLinks, clicksByDay, browserStats, osStats, deviceStats] = await Promise.all([
      this.prisma.analytics.count({ where: { eventType: 'CLICK', clickedAt: { gte: since } } }),
      this.prisma.analytics.count({ where: { eventType: 'SCAN', clickedAt: { gte: since } } }),
      this.prisma.link.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { clickCount: 'desc' },
        take: 10,
        select: { id: true, slug: true, destination: true, clickCount: true, user: { select: { email: true } } },
      }),
      this.prisma.$queryRawUnsafe<Array<{ date: string; count: bigint }>>(
        `SELECT DATE(clicked_at) as date, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND clicked_at >= $1 GROUP BY DATE(clicked_at) ORDER BY date ASC`,
        since,
      ),
      this.prisma.$queryRawUnsafe<Array<{ browser: string; count: bigint }>>(
        `SELECT COALESCE(browser, 'Unknown') as browser, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND clicked_at >= $1 GROUP BY browser ORDER BY count DESC`,
        since,
      ),
      this.prisma.$queryRawUnsafe<Array<{ os: string; count: bigint }>>(
        `SELECT COALESCE(os, 'Unknown') as os, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND clicked_at >= $1 GROUP BY os ORDER BY count DESC`,
        since,
      ),
      this.prisma.$queryRawUnsafe<Array<{ device: string; count: bigint }>>(
        `SELECT COALESCE(device, 'Unknown') as device, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND clicked_at >= $1 GROUP BY device ORDER BY count DESC`,
        since,
      ),
    ]);

    return {
      totalClicks: clicks,
      totalScans: scans,
      topLinks,
      clicksByDay: clicksByDay.map((r) => ({ date: r.date, count: Number(r.count) })),
      browserStats: browserStats.map((r) => ({ browser: r.browser, count: Number(r.count) })),
      osStats: osStats.map((r) => ({ os: r.os, count: Number(r.count) })),
      deviceStats: deviceStats.map((r) => ({ device: r.device, count: Number(r.count) })),
    };
  }

  async getTiers() {
    return this.prisma.tier.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async updateTier(id: string, data: { name?: string; priceMonthly?: number; priceAnnual?: number; isActive?: boolean }) {
    const tier = await this.prisma.tier.findUnique({ where: { id } });
    if (!tier) {
      throw new NotFoundException('Tier not found.');
    }

    return this.prisma.tier.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.priceMonthly !== undefined && { priceMonthly: data.priceMonthly }),
        ...(data.priceAnnual !== undefined && { priceAnnual: data.priceAnnual }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }
}
