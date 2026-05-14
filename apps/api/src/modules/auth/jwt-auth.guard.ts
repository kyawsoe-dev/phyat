import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { AuthenticatedRequest } from '../../common/auth/authenticated-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { tier: true },
      });

      if (!user) {
        throw new UnauthorizedException('Authentication required.');
      }

      request.user = {
        id: user.id,
        email: user.email,
        tier: {
          code: user.tier.code,
          maxLinks: user.tier.maxLinks,
        },
      };
      return true;
    } catch {
      throw new UnauthorizedException('Authentication required.');
    }
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const header = request.headers.authorization;
    const [type, token] = header?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
