import { Request } from 'express';
import type { TierCapabilities } from '../../modules/subscriptions/application/tier-capability.service';

export type AuthenticatedUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  tier: TierCapabilities;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
