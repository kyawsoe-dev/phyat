import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TierCode } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { SubscriptionsService } from '../subscriptions/application/subscriptions.service';
import { InvoiceService } from '../invoices/invoice.service';

@Injectable()
export class UpgradeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subs: SubscriptionsService,
    private readonly invoiceService: InvoiceService,
  ) {}

  async create(userId: string, tierCode: string) {
    if (!Object.values(TierCode).includes(tierCode as TierCode)) {
      throw new BadRequestException('Invalid tier code.');
    }
    const tier = await this.prisma.tier.findUnique({ where: { code: tierCode as TierCode } });
    if (!tier || !tier.isActive) {
      throw new NotFoundException('Tier not found.');
    }

    const existing = await this.prisma.upgradeRequest.findFirst({
      where: { userId, status: 'PENDING' },
    });
    if (existing) {
      throw new BadRequestException('You already have a pending upgrade request.');
    }

    return this.prisma.upgradeRequest.create({
      data: { userId, requestedTierId: tier.id },
      include: { tier: { select: { name: true, code: true } } },
    });
  }

  async getUserRequests(userId: string) {
    return this.prisma.upgradeRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { tier: { select: { name: true, code: true } } },
    });
  }

  async getAllRequests(page: number, limit: number, status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      this.prisma.upgradeRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
          tier: { select: { name: true, code: true } },
        },
      }),
      this.prisma.upgradeRequest.count({ where }),
    ]);

    return { requests, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approve(id: string) {
    const request = await this.prisma.upgradeRequest.findUnique({
      where: { id },
      include: { tier: true },
    });
    if (!request) throw new NotFoundException('Request not found.');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been processed.');
    }

    await this.subs.applyTier(request.userId, request.tier.code, 'MONTHLY');

    // Auto-create invoice for paid upgrades (using monthly price, consistent with current applyTier)
    if (request.tier.priceMonthly && request.tier.priceMonthly > 0) {
      await this.invoiceService.createInvoice(
        request.userId,
        request.tier.priceMonthly,
        `Upgrade to ${request.tier.name} (Monthly)`,
      );
    }

    return this.prisma.upgradeRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        tier: { select: { name: true, code: true } },
      },
    });
  }

  async deny(id: string, note?: string) {
    const request = await this.prisma.upgradeRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found.');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been processed.');
    }

    return this.prisma.upgradeRequest.update({
      where: { id },
      data: { status: 'DENIED', adminNote: note },
      include: {
        user: { select: { id: true, email: true, name: true } },
        tier: { select: { name: true, code: true } },
      },
    });
  }
}
