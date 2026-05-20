import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/auth/authenticated-user';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const key = this.extractKey(request);
    request.user = await this.apiKeys.authenticate(key);
    return true;
  }

  private extractKey(request: AuthenticatedRequest): string | undefined {
    const phApiKey = request.headers['ph-api-key'];
    if (phApiKey) return Array.isArray(phApiKey) ? phApiKey[0] : phApiKey;

    const auth = request.headers.authorization;
    const [type, token] = auth?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
