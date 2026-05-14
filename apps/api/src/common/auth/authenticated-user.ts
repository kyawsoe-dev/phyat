import { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  email: string;
  tier: {
    code: 'FREE' | 'PRO' | 'DEVELOPER';
    maxLinks: number | null;
  };
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
