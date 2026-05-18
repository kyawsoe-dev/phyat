import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthenticatedRequest } from '../../common/auth/authenticated-user';

@Injectable()
export class TierLimitGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return false;
    }

    const maxLinks = user.tier.maxLinksPerMonth ?? user.tier.maxLinks;

    if (maxLinks === null || maxLinks === undefined) {
      return true;
    }

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const linkCount = await this.prisma.link.count({
      where: {
        userId: user.id,
        createdAt: { gte: monthStart },
      },
    });

    if (linkCount >= maxLinks) {
      throw new ForbiddenException('ကျေးဇူးပြု၍ သင်၏အစီအစဉ်ကို Upgrade လုပ်ပါ (Please upgrade your plan).');
    }

    return true;
  }
}
