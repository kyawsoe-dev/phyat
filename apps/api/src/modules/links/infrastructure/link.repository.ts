import { Injectable } from '@nestjs/common';
import { Prisma, Link, LinkStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class LinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBySlug(slug: string): Promise<Link | null> {
    return this.prisma.link.findUnique({ where: { slug } });
  }

  create(data: Prisma.LinkCreateInput): Promise<Link> {
    return this.prisma.link.create({ data });
  }

  async listForDashboard(userId: string, cursor?: string, take = 50) {
    return this.prisma.link.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      select: {
        id: true,
        slug: true,
        title: true,
        destination: true,
        expiresAt: true,
        passwordHash: true,
        status: true,
        clickCount: true,
        qrCodeDataUrl: true,
        createdAt: true,
        domainId: true,
        domain: { select: { domain: true } },
      },
    });
  }

  findOwned(id: string, userId: string): Promise<Link | null> {
    return this.prisma.link.findFirst({ where: { id, userId } });
  }

  updateOwned(id: string, userId: string, data: Prisma.LinkUpdateInput): Promise<Link> {
    return this.prisma.link.update({
      where: { id, userId },
      data,
    });
  }

  toggleStatus(id: string, userId: string, active: boolean): Promise<Link> {
    return this.updateOwned(id, userId, {
      status: active ? LinkStatus.ACTIVE : LinkStatus.DISABLED,
    });
  }

  incrementClickCount(id: string): Promise<Link> {
    return this.prisma.link.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
    });
  }

  countByUser(userId: string): Promise<number> {
    return this.prisma.link.count({ where: { userId } });
  }

  deleteOwned(id: string, userId: string): Promise<Link> {
    return this.prisma.link.delete({ where: { id, userId } });
  }
}
