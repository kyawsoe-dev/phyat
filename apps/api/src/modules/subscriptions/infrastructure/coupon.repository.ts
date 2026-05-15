import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class CouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string) {
    return this.prisma.coupon.findUnique({ where: { code } });
  }

  incrementUsed(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }

  findRedemption(couponId: string, userId: string) {
    return this.prisma.couponRedemption.findUnique({
      where: { couponId_userId: { couponId, userId } },
    });
  }

  createRedemption(couponId: string, userId: string) {
    return this.prisma.couponRedemption.create({
      data: { couponId, userId },
    });
  }

  countUserRedemptions(userId: string) {
    return this.prisma.couponRedemption.count({ where: { userId } });
  }
}
