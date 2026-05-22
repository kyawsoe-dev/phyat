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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalLinks, totalClicks, usersThisMonth, linksThisMonth, clicksToday, tierDistribution, recentUsers, activeUsers, topLinks, uniqueIps, clicksLastMonth] = await Promise.all([
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
      this.prisma.link.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startOfMonth } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.prisma.link.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { clickCount: 'desc' },
        take: 5,
        select: { id: true, slug: true, destination: true, clickCount: true, user: { select: { email: true } } },
      }),
      this.prisma.analytics.findMany({
        where: { clickedAt: { gte: thirtyDaysAgo } },
        select: { ip: true },
        distinct: ['ip'],
      }),
      this.prisma.analytics.count({ where: { eventType: 'CLICK', clickedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    ]);

    const tiers = await this.prisma.tier.findMany({ select: { id: true, name: true, code: true } });
    const tierMap = Object.fromEntries(tiers.map((t) => [t.id, t.name]));

    const activeUserIds = activeUsers.map((u) => u.userId);
    const activeUserDetails = activeUserIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: activeUserIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
    const activeUserMap = Object.fromEntries(activeUserDetails.map((u) => [u.id, u]));

    const clickGrowth = clicksLastMonth > 0
      ? Math.round(((totalClicks - clicksLastMonth) / clicksLastMonth) * 100)
      : 0;

    return {
      totalUsers,
      totalLinks,
      totalClicks,
      usersThisMonth,
      linksThisMonth,
      clicksToday,
      clickGrowth,
      uniqueIps: uniqueIps.length,
      tierDistribution: tierDistribution.map((t) => ({
        tier: tierMap[t.tierId] ?? 'Unknown',
        count: t._count,
      })),
      recentUsers,
      mostActiveUsers: activeUsers.map((u) => ({
        id: u.userId,
        email: activeUserMap[u.userId]?.email ?? 'Unknown',
        name: activeUserMap[u.userId]?.name ?? null,
        linkCount: u._count.id,
      })),
      topLinks,
    };
  }

  async getSystemHealth() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeLinks, clicksLastHour, scansLastHour, linksCreated, usersActiveToday, uniqueIpsToday] = await Promise.all([
      this.prisma.link.count({ where: { status: 'ACTIVE' } }),
      this.prisma.analytics.count({ where: { eventType: 'CLICK', clickedAt: { gte: oneHourAgo } } }),
      this.prisma.analytics.count({ where: { eventType: 'SCAN', clickedAt: { gte: oneHourAgo } } }),
      this.prisma.link.count({ where: { createdAt: { gte: oneHourAgo } } }),
      this.prisma.link.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: today } },
        _count: { id: true },
      }),
      this.prisma.analytics.findMany({
        where: { clickedAt: { gte: today } },
        select: { ip: true },
        distinct: ['ip'],
      }),
    ]);

    return {
      activeLinks,
      clicksLastHour,
      scansLastHour,
      linksCreatedLastHour: linksCreated,
      activeUsersToday: usersActiveToday.length,
      uniqueIpsToday: uniqueIpsToday.length,
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
          googleId: true,
          passwordHash: true,
          user2faEnabled: true,
          admin2faEnabled: true,
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
        hasGoogle: !!u.googleId,
        hasPassword: !!u.passwordHash,
        user2faEnabled: u.user2faEnabled,
        admin2faEnabled: u.admin2faEnabled,
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

  async createUser(data: { email: string; name?: string; password?: string; tierCode?: string; isAdmin?: boolean }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already in use.');

    let tierId: string | undefined;
    if (data.tierCode) {
      const tier = await this.prisma.tier.findUnique({ where: { code: data.tierCode as TierCode } });
      if (!tier) throw new NotFoundException('Tier not found.');
      tierId = tier.id;
    } else {
      const freeTier = await this.prisma.tier.findFirst({ where: { code: 'FREE' }, orderBy: { sortOrder: 'asc' } });
      tierId = freeTier?.id;
    }

    const createData: Record<string, unknown> = {
      email: data.email,
      name: data.name || null,
      tierId,
    };
    if (data.password) {
      createData.passwordHash = await bcrypt.hash(data.password, 10);
    }
    if (data.isAdmin !== undefined) {
      createData.isAdmin = data.isAdmin;
    }

    return this.prisma.user.create({
      data: createData as any,
      select: { id: true, email: true, name: true, isAdmin: true, createdAt: true, tier: { select: { code: true, name: true } } },
    });
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

  async updateLink(id: string, data: {
    title?: string;
    notes?: string;
    destination?: string;
    status?: 'ACTIVE' | 'DISABLED';
    tags?: string[];
  }) {
    const link = await this.prisma.link.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException('Link not found.');
    }

    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.destination !== undefined) updateData.destination = data.destination;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.tags !== undefined) updateData.tags = data.tags;

    if (Object.keys(updateData).length === 0) {
      return { success: true, message: 'No changes' };
    }

    await this.prisma.link.update({
      where: { id },
      data: updateData,
    });

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

    const [clicks, scans, topLinks, clicksByDay, browserStats, osStats, deviceStats, countryStats, referrerStats, cityStats] = await Promise.all([
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
      this.prisma.$queryRawUnsafe<Array<{ country: string; count: bigint }>>(
        `SELECT COALESCE(country, 'Unknown') as country, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND clicked_at >= $1 GROUP BY country ORDER BY count DESC`,
        since,
      ),
      this.prisma.$queryRawUnsafe<Array<{ referrerDomain: string; count: bigint }>>(
        `SELECT COALESCE(referrer_domain, 'Direct') as referrerDomain, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND clicked_at >= $1 GROUP BY referrer_domain ORDER BY count DESC`,
        since,
      ),
      this.prisma.$queryRawUnsafe<Array<{ city: string; count: bigint }>>(
        `SELECT COALESCE(city, 'Unknown') as city, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND clicked_at >= $1 GROUP BY city ORDER BY count DESC`,
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
      countryStats: countryStats.map((r) => ({ country: r.country, count: Number(r.count) })),
      referrerStats: referrerStats.map((r) => ({ referrerDomain: r.referrerDomain, count: Number(r.count) })),
      cityStats: cityStats.map((r) => ({ city: r.city, count: Number(r.count) })),
    };
  }

  async getUserAnalytics(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    const [totalClicks, totalScans, topLinks, clicksByDay, browserStats, osStats, deviceStats, countryStats, referrerStats] = await Promise.all([
      this.prisma.analytics.count({ where: { link: { userId }, eventType: 'CLICK' } }),
      this.prisma.analytics.count({ where: { link: { userId }, eventType: 'SCAN' } }),
      this.prisma.link.findMany({
        where: { userId },
        orderBy: { clickCount: 'desc' },
        take: 10,
        select: { id: true, slug: true, destination: true, clickCount: true, scanCount: true },
      }),
      this.prisma.$queryRawUnsafe<Array<{ date: string; count: bigint }>>(
        `SELECT DATE(a.clicked_at) as date, COUNT(*) as count FROM analytics a JOIN links l ON l.id = a.link_id WHERE a.event_type = 'CLICK' AND l.user_id = $1 GROUP BY DATE(a.clicked_at) ORDER BY date ASC`,
        userId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ browser: string; count: bigint }>>(
        `SELECT COALESCE(a.browser, 'Unknown') as browser, COUNT(*) as count FROM analytics a JOIN links l ON l.id = a.link_id WHERE a.event_type = 'CLICK' AND l.user_id = $1 GROUP BY a.browser ORDER BY count DESC`,
        userId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ os: string; count: bigint }>>(
        `SELECT COALESCE(a.os, 'Unknown') as os, COUNT(*) as count FROM analytics a JOIN links l ON l.id = a.link_id WHERE a.event_type = 'CLICK' AND l.user_id = $1 GROUP BY a.os ORDER BY count DESC`,
        userId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ device: string; count: bigint }>>(
        `SELECT COALESCE(a.device, 'Unknown') as device, COUNT(*) as count FROM analytics a JOIN links l ON l.id = a.link_id WHERE a.event_type = 'CLICK' AND l.user_id = $1 GROUP BY a.device ORDER BY count DESC`,
        userId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ country: string; count: bigint }>>(
        `SELECT COALESCE(a.country, 'Unknown') as country, COUNT(*) as count FROM analytics a JOIN links l ON l.id = a.link_id WHERE a.event_type = 'CLICK' AND l.user_id = $1 GROUP BY a.country ORDER BY count DESC`,
        userId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ referrerDomain: string; count: bigint }>>(
        `SELECT COALESCE(a.referrer_domain, 'Direct') as referrerDomain, COUNT(*) as count FROM analytics a JOIN links l ON l.id = a.link_id WHERE a.event_type = 'CLICK' AND l.user_id = $1 GROUP BY a.referrer_domain ORDER BY count DESC`,
        userId,
      ),
    ]);

    return {
      user,
      totalClicks,
      totalScans,
      topLinks,
      clicksByDay: clicksByDay.map((r) => ({ date: r.date, count: Number(r.count) })),
      browserStats: browserStats.map((r) => ({ browser: r.browser, count: Number(r.count) })),
      osStats: osStats.map((r) => ({ os: r.os, count: Number(r.count) })),
      deviceStats: deviceStats.map((r) => ({ device: r.device, count: Number(r.count) })),
      countryStats: countryStats.map((r) => ({ country: r.country, count: Number(r.count) })),
      referrerStats: referrerStats.map((r) => ({ referrerDomain: r.referrerDomain, count: Number(r.count) })),
    };
  }

  async getLinkAnalytics(linkId: string, page: number = 1, limit: number = 50) {
    const link = await this.prisma.link.findUnique({
      where: { id: linkId },
      select: { id: true, slug: true, destination: true, title: true, clickCount: true, scanCount: true, userId: true, user: { select: { email: true, name: true } } },
    });
    if (!link) throw new NotFoundException('Link not found.');

    const [clicks, total] = await Promise.all([
      this.prisma.analytics.findMany({
        where: { linkId, eventType: 'CLICK' },
        orderBy: { clickedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.analytics.count({ where: { linkId, eventType: 'CLICK' } }),
    ]);

    return {
      link,
      clicks: clicks.map((c) => ({
        id: c.id,
        ip: c.ip,
        country: c.country,
        city: c.city,
        browser: c.browser,
        os: c.os,
        device: c.device,
        referrer: c.referrer,
        referrerDomain: c.referrerDomain,
        userAgent: c.userAgent,
        clickedAt: c.clickedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLinkAnalyticsStats(linkId: string) {
    const link = await this.prisma.link.findUnique({
      where: { id: linkId },
      select: { id: true, slug: true, destination: true, title: true, clickCount: true, scanCount: true },
    });
    if (!link) throw new NotFoundException('Link not found.');

    const [clicksByDay, browserStats, osStats, deviceStats, countryStats, referrerStats] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<{ date: string; count: bigint }>>(
        `SELECT DATE(clicked_at) as date, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND link_id = $1 GROUP BY DATE(clicked_at) ORDER BY date ASC`,
        linkId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ browser: string; count: bigint }>>(
        `SELECT COALESCE(browser, 'Unknown') as browser, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND link_id = $1 GROUP BY browser ORDER BY count DESC`,
        linkId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ os: string; count: bigint }>>(
        `SELECT COALESCE(os, 'Unknown') as os, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND link_id = $1 GROUP BY os ORDER BY count DESC`,
        linkId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ device: string; count: bigint }>>(
        `SELECT COALESCE(device, 'Unknown') as device, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND link_id = $1 GROUP BY device ORDER BY count DESC`,
        linkId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ country: string; count: bigint }>>(
        `SELECT COALESCE(country, 'Unknown') as country, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND link_id = $1 GROUP BY country ORDER BY count DESC`,
        linkId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ referrerDomain: string; count: bigint }>>(
        `SELECT COALESCE(referrer_domain, 'Direct') as referrerDomain, COUNT(*) as count FROM analytics WHERE event_type = 'CLICK' AND link_id = $1 GROUP BY referrer_domain ORDER BY count DESC`,
        linkId,
      ),
    ]);

    return {
      link,
      totalClicks: link.clickCount,
      totalScans: link.scanCount,
      clicksByDay: clicksByDay.map((r) => ({ date: r.date, count: Number(r.count) })),
      browserStats: browserStats.map((r) => ({ browser: r.browser, count: Number(r.count) })),
      osStats: osStats.map((r) => ({ os: r.os, count: Number(r.count) })),
      deviceStats: deviceStats.map((r) => ({ device: r.device, count: Number(r.count) })),
      countryStats: countryStats.map((r) => ({ country: r.country, count: Number(r.count) })),
      referrerStats: referrerStats.map((r) => ({ referrerDomain: r.referrerDomain, count: Number(r.count) })),
    };
  }

  async exportAnalytics(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const clicks = await this.prisma.analytics.findMany({
      where: { eventType: 'CLICK', clickedAt: { gte: since } },
      orderBy: { clickedAt: 'desc' },
      include: {
        link: { select: { slug: true, destination: true, user: { select: { email: true } } } },
      },
    });

    return clicks.map((c) => ({
      date: c.clickedAt.toISOString(),
      slug: c.link.slug,
      destination: c.link.destination,
      userEmail: c.link.user.email,
      ip: c.ip,
      country: c.country,
      city: c.city,
      browser: c.browser,
      os: c.os,
      device: c.device,
      referrer: c.referrer,
      referrerDomain: c.referrerDomain,
      userAgent: c.userAgent,
    }));
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
