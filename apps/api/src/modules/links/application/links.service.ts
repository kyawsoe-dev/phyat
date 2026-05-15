import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LinkStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as QRCode from 'qrcode';
import { CreateLinkDto, UpdateLinkDto } from './dto';
import { SlugService } from './slug.service';
import { LinkRepository } from '../infrastructure/link.repository';
import { CacheService } from '../infrastructure/cache.service';
import { DomainRepository } from '../../domains/infrastructure/domain.repository';
import { normalizeSlug } from '../domain/link-policy';

export type PaginatedLinks = {
  data: Array<{
    id: string;
    slug: string;
    title: string | null;
    destination: string;
    expiresAt: Date | null;
    passwordHash: string | null;
    status: string;
    clickCount: number;
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
  ) {}

  async create(userId: string, input: CreateLinkDto) {
    const slug = input.customAlias ? normalizeSlug(input.customAlias) : await this.reserveGeneratedSlug();
    const existing = await this.links.findBySlug(slug);

    if (existing) {
      throw new ConflictException('That back-half is already taken.');
    }

    let domainName = this.config.get<string>('PUBLIC_SHORT_URL') ?? 'http://localhost:3000';
    let domainConnect = undefined;

    if (input.domainId) {
      const domain = await this.domains.findById(input.domainId, userId);
      if (domain && domain.verified) {
        domainName = `https://${domain.domain}`;
        domainConnect = { connect: { id: input.domainId } };
      }
    }

    const shortUrl = `${domainName}/${slug}`;
    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
    const qrCodeDataUrl = input.generateQR !== false ? await QRCode.toDataURL(shortUrl, { margin: 1, width: 512 }) : undefined;

    const link = await this.links.create({
      slug,
      destination: input.destination,
      title: input.title,
      user: { connect: { id: userId } },
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      passwordHash,
      qrCodeDataUrl,
      ...(input.campaignId ? { campaign: { connect: { id: input.campaignId } } } : {}),
      ...(domainConnect ? { domain: domainConnect } : {}),
    });

    this.cache.set(slug, {
      id: link.id,
      destination: link.destination,
      passwordHash: link.passwordHash,
      status: link.status,
      expiresAt: link.expiresAt,
    });

    return link;
  }

  async listDashboardLinks(userId: string, cursor?: string): Promise<PaginatedLinks> {
    const items = await this.links.listForDashboard(userId, cursor);
    const nextCursor = items.length > 50 ? items[50].id : null;
    return {
      data: items.slice(0, 50),
      nextCursor,
    };
  }

  async update(userId: string, id: string, input: UpdateLinkDto) {
    const link = await this.links.findOwned(id, userId);

    if (!link) {
      throw new NotFoundException('Link not found.');
    }

    const passwordHash = input.removePassword
      ? null
      : input.password
        ? await bcrypt.hash(input.password, 12)
        : undefined;

    const updated = await this.links.updateOwned(id, userId, {
      status: input.active === undefined ? undefined : input.active ? LinkStatus.ACTIVE : LinkStatus.DISABLED,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      passwordHash,
      destination: input.destination,
      title: input.title,
    });

    this.cache.invalidate(link.slug);

    return updated;
  }

  async delete(userId: string, id: string) {
    const link = await this.links.findOwned(id, userId);
    if (!link) {
      throw new NotFoundException('Link not found.');
    }
    this.cache.invalidate(link.slug);
    return this.links.deleteOwned(id, userId);
  }

  async getGatewayMetadata(slug: string) {
    const link = await this.links.findBySlug(normalizeSlug(slug));

    if (!link) {
      throw new NotFoundException('Link not found.');
    }

    return {
      slug: link.slug,
      destination: link.destination,
      title: link.title,
      hasPassword: Boolean(link.passwordHash),
      expiresAt: link.expiresAt,
      isExpired: Boolean(link.expiresAt && link.expiresAt <= new Date()),
      status: link.status,
    };
  }

  private async reserveGeneratedSlug() {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const slug = this.slugService.generate();
      const existing = await this.links.findBySlug(slug);

      if (!existing) {
        return slug;
      }
    }

    throw new ConflictException('Unable to allocate a unique slug. Try again.');
  }
}
