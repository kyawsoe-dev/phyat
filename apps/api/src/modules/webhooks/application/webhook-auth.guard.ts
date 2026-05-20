import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../common/prisma.service';
import { AuthenticatedRequest } from '../../../common/auth/authenticated-user';
import { ApiKeyService } from '../../api-keys/api-key.service';
import { TIER_SELECT } from '../../subscriptions/application/tier-capability.service';

@Injectable()
export class WebhookAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly apiKeys: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (token.startsWith('phyat_live_')) {
      request.user = await this.apiKeys.authenticate(token);
      return true;
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, isAdmin: true, tier: { select: TIER_SELECT } },
      });

      if (!user) {
        throw new UnauthorizedException('Authentication required.');
      }

      request.user = {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        tier: user.tier,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Authentication required.');
    }
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const phApiKey = request.headers['ph-api-key'];
    if (phApiKey) return Array.isArray(phApiKey) ? phApiKey[0] : phApiKey;

    const header = request.headers.authorization;
    const [type, token] = header?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
