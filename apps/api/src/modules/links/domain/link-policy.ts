import { Link, LinkStatus } from '@prisma/client';

export function isExpired(link: Pick<Link, 'expiresAt'>, now = new Date()): boolean {
  return Boolean(link.expiresAt && link.expiresAt <= now);
}

export function isRedirectable(link: Pick<Link, 'expiresAt' | 'status'>, now = new Date()): boolean {
  return link.status === LinkStatus.ACTIVE && !isExpired(link, now);
}

export function normalizeSlug(slug: string): string {
  return slug.trim();
}
