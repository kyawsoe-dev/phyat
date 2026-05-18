import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LinkStatus, UsageFeature } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as QRCode from 'qrcode';
import { CreateLinkDto, UpdateLinkDto } from './dto';
import { SlugService } from './slug.service';
import { LinkRepository } from '../infrastructure/link.repository';
import { CacheService } from '../infrastructure/cache.service';
import { DomainRepository } from '../../domains/infrastructure/domain.repository';
import { normalizeSlug } from '../domain/link-policy';
import { TierCapabilityService } from '../../subscriptions/application/tier-capability.service';
import { UsageService } from '../../subscriptions/application/usage.service';
import { PrismaService } from '../../../common/prisma.service';
import { WebhooksService } from '../../webhooks/application/webhooks.service';

export type PaginatedLinks = {
  data: Array<{
    id: string;
    shortHost: string;
    slug: string;
    title: string | null;
    notes: string | null;
    tags: string[];
    destination: string;
    expiresAt: Date | null;
    passwordHash: string | null;
    status: string;
    archivedAt: Date | null;
    clickCount: number;
    scanCount: number;
    qrCodeDataUrl: string | null;
    createdAt: Date;
    domainId: string | null;
    domain?: { domain: string } | null;
  }>;
  nextCursor: string | null;
};

@Injectable()
export class LinksService {
  constructor(
    private readonly links: LinkRepository,
    private readonly domains: DomainRepository,
    private readonly slugService: SlugService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    private readonly tiers: TierCapabilityService,
    private readonly usage: UsageService,
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
  ) {}

  async create(userId: string, input: CreateLinkDto) {
    const tier = await this.tiers.getUserTier(userId);
    const monthCount = await this.links.countForMonth(userId, this.usage.monthStart());
    this.tiers.requireLimit(tier, 'maxLinksPerMonth', monthCount);
    if (input.utmParams || input.customParams) this.tiers.requireFeature(tier, 'utmBuilder');
    if (input.campaignId) this.tiers.requireFeature(tier, 'campaignsEnabled');

    const host = await this.resolveShortHost(userId, input.domainId, tier);
    const slug = input.customAlias ? normalizeSlug(input.customAlias) : await this.reserveGeneratedSlug(host);
    const existing = await this.links.findBySlug(slug, host);
    if (existing) throw new ConflictException('That back-half is already taken on this domain.');

    const shortUrl = `https://${host}/${slug}`;
    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
    const destination = this.composeDestination(input.destination, input.utmParams, input.customParams);
    let qrCodeDataUrl: string | undefined;
    if (input.generateQR !== false) {
      const qrCount = await this.usage.getCount(userId, UsageFeature.QR_CODES);
      this.tiers.requireLimit(tier, 'maxQrCodesPerMonth', qrCount);
      qrCodeDataUrl = await QRCode.toDataURL(shortUrl, { margin: 1, width: 512 });
    }

    const link = await this.links.create({
      shortHost: host,
      slug,
      destination,
      title: input.title,
      notes: input.notes,
      tags: input.tags ?? [],
      utmParams: input.utmParams,
      customParams: input.customParams,
      redirectType: input.redirectType ?? 'TEMPORARY',
      user: { connect: { id: userId } },
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      passwordHash,
      qrCodeDataUrl,
      ...(input.campaignId ? { campaign: { connect: { id: input.campaignId } } } : {}),
      ...(input.domainId ? { domain: { connect: { id: input.domainId } } } : {}),
      ...(qrCodeDataUrl
        ? { qrCodes: { create: { userId, title: input.title, imageDataUrl: qrCodeDataUrl, imageFormat: 'png' } } }
        : {}),
    });

    this.cache.set(this.cacheKey(host, slug), {
      id: link.id,
      userId: link.userId,
      destination: link.destination,
      passwordHash: link.passwordHash,
      status: link.status,
      expiresAt: link.expiresAt,
    });
    await this.usage.increment(userId, tier.id, UsageFeature.LINKS);
    if (qrCodeDataUrl) await this.usage.increment(userId, tier.id, UsageFeature.QR_CODES);
    void this.webhooks.publish(userId, 'LINK_CREATED', { id: link.id, slug: link.slug, shortHost: link.shortHost });
    if (qrCodeDataUrl) void this.webhooks.publish(userId, 'QR_CREATED', { linkId: link.id, slug: link.slug });
    return link;
  }

  async listDashboardLinks(userId: string, cursor?: string): Promise<PaginatedLinks> {
    const items = await this.links.listForDashboard(userId, cursor);
    const nextCursor = items.length > 50 ? items[50].id : null;
    return { data: items.slice(0, 50) as PaginatedLinks['data'], nextCursor };
  }

  async update(userId: string, id: string, input: UpdateLinkDto) {
    const link = await this.links.findOwned(id, userId);
    if (!link) throw new NotFoundException('Link not found.');

    const tier = await this.tiers.getUserTier(userId);
    if (input.utmParams || input.customParams) this.tiers.requireFeature(tier, 'utmBuilder');
    const host = input.domainId !== undefined ? await this.resolveShortHost(userId, input.domainId || undefined, tier) : link.shortHost;
    const slug = input.customAlias ? normalizeSlug(input.customAlias) : link.slug;
    if (host !== link.shortHost || slug !== link.slug) {
      const existing = await this.links.findBySlug(slug, host);
      if (existing && existing.id !== link.id) throw new ConflictException('That back-half is already taken on this domain.');
    }

    const passwordHash = input.removePassword ? null : input.password ? await bcrypt.hash(input.password, 12) : undefined;
    const destination = input.destination ? this.composeDestination(input.destination, input.utmParams, input.customParams) : undefined;
    const updated = await this.links.updateOwned(id, userId, {
      shortHost: host,
      slug,
      status: input.active === undefined ? undefined : input.active ? LinkStatus.ACTIVE : LinkStatus.DISABLED,
      archivedAt: input.archived === undefined ? undefined : input.archived ? new Date() : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      passwordHash,
      destination,
      title: input.title,
      notes: input.notes,
      tags: input.tags,
      utmParams: input.utmParams,
      customParams: input.customParams,
      redirectType: input.redirectType,
      ...(input.domainId !== undefined ? { domain: input.domainId ? { connect: { id: input.domainId } } : { disconnect: true } } : {}),
    });

    this.cache.invalidate(this.cacheKey(link.shortHost, link.slug));
    this.cache.invalidate(this.cacheKey(updated.shortHost, updated.slug));
    void this.webhooks.publish(userId, 'LINK_UPDATED', { id: updated.id, slug: updated.slug, shortHost: updated.shortHost });
    return updated;
  }

  async delete(userId: string, id: string) {
    const link = await this.links.findOwned(id, userId);
    if (!link) throw new NotFoundException('Link not found.');
    this.cache.invalidate(this.cacheKey(link.shortHost, link.slug));
    const deleted = await this.links.deleteOwned(id, userId);
    void this.webhooks.publish(userId, 'LINK_DELETED', { id: deleted.id, slug: deleted.slug, shortHost: deleted.shortHost });
    return deleted;
  }

  async getGatewayMetadata(slug: string, shortHost?: string) {
    const link = await this.links.findBySlug(normalizeSlug(slug), shortHost);
    if (!link) throw new NotFoundException('Link not found.');
    return {
      slug: link.slug,
      shortHost: link.shortHost,
      destination: link.destination,
      title: link.title,
      hasPassword: Boolean(link.passwordHash),
      expiresAt: link.expiresAt,
      isExpired: Boolean(link.expiresAt && link.expiresAt <= new Date()),
      status: link.status,
      archivedAt: link.archivedAt,
    };
  }

  async exportLinks(userId: string) {
    const tier = await this.tiers.getUserTier(userId);
    this.tiers.requireFeature(tier, 'exportData');
    const links = await this.prisma.link.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { domain: true } });
    await this.usage.increment(userId, tier.id, UsageFeature.EXPORTS);
    const header = ['id', 'shortUrl', 'destination', 'title', 'tags', 'status', 'clickCount', 'scanCount', 'createdAt'];
    const rows = links.map((l) => [
      l.id,
      `https://${l.shortHost}/${l.slug}`,
      l.destination,
      l.title ?? '',
      l.tags.join('|'),
      l.archivedAt ? 'ARCHIVED' : l.status,
      String(l.clickCount),
      String(l.scanCount),
      l.createdAt.toISOString(),
    ]);
    return [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  private async resolveShortHost(userId: string, domainId: string | undefined, tier: { customDomains: boolean }) {
    if (domainId) {
      this.tiers.requireFeature(tier as never, 'customDomains');
      const domain = await this.domains.findById(domainId, userId);
      if (!domain || !domain.verified) throw new ConflictException('Domain must be verified before using it.');
      return domain.domain;
    }
    const base = this.config.get<string>('PUBLIC_SHORT_URL') ?? 'http://localhost:3000';
    return base.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  private composeDestination(destination: string, utmParams?: Record<string, string>, customParams?: Record<string, string>) {
    const url = new URL(destination);
    const params = { ...(utmParams ?? {}), ...(customParams ?? {}) };
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private async reserveGeneratedSlug(shortHost: string) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const slug = this.slugService.generate();
      const existing = await this.links.findBySlug(slug, shortHost);
      if (!existing) return slug;
    }
    throw new ConflictException('Unable to allocate a unique slug. Try again.');
  }

  private cacheKey(shortHost: string, slug: string) {
    return `${shortHost}/${slug}`;
  }
}
