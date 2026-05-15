import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type { SubscriptionStatus, BillingCycle } from '@prisma/client';

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActive(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { tier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: {
    userId: string;
    tierId: string;
    billingCycle: BillingCycle;
    currentPeriodEnd: Date;
  }) {
    return this.prisma.subscription.create({
      data: {
        userId: data.userId,
        tierId: data.tierId,
        status: 'ACTIVE',
        billingCycle: data.billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: data.currentPeriodEnd,
      },
      include: { tier: true },
    });
  }

  cancel(id: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELED', canceledAt: new Date() },
      include: { tier: true },
    });
  }

  findAllByUser(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: { tier: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
