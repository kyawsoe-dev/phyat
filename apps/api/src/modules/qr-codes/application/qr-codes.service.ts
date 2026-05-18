import { GoneException, Injectable, NotFoundException, Res } from '@nestjs/common';
import { Prisma, UsageFeature } from '@prisma/client';
import * as QRCode from 'qrcode';
import { Response } from 'express';
import { PrismaService } from '../../../common/prisma.service';
import { AnalyticsService } from '../../analytics/application/analytics.service';
import { TierCapabilityService } from '../../subscriptions/application/tier-capability.service';
import { UsageService } from '../../subscriptions/application/usage.service';
import { WebhooksService } from '../../webhooks/application/webhooks.service';
import { isRedirectable } from '../../links/domain/link-policy';
import type { ClickContext } from '../../links/application/dto';
import { CreateQrCodeDto, UpdateQrCodeDto } from './dto';

@Injectable()
export class QrCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tiers: TierCapabilityService,
    private readonly usage: UsageService,
    private readonly analytics: AnalyticsService,
    private readonly webhooks: WebhooksService,
  ) {}

  list(userId: string) {
    return this.prisma.qrCode.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: { link: { select: { id: true, slug: true, shortHost: true, title: true, destination: true, clickCount: true } } },
    });
  }

  async create(userId: string, input: CreateQrCodeDto) {
    const tier = await this.tiers.getUserTier(userId);
    const count = await this.usage.getCount(userId, UsageFeature.QR_CODES);
    this.tiers.requireLimit(tier, 'maxQrCodesPerMonth', count);
    if (input.design && Object.keys(input.design).length > 0) this.tiers.requireFeature(tier, 'qrCustomization');
    const link = await this.prisma.link.findFirst({ where: { id: input.linkId, userId } });
    if (!link) throw new NotFoundException('Link not found.');
    const shortUrl = this.shortUrlForHost(link.shortHost, link.slug);
    const imageDataUrl = await QRCode.toDataURL(shortUrl, { margin: 1, width: 512 });
    const qr = await this.prisma.qrCode.create({
      data: { userId, linkId: link.id, title: input.title ?? link.title, design: input.design as Prisma.InputJsonValue, imageDataUrl, imageFormat: 'png' },
    });
    await this.usage.increment(userId, tier.id, UsageFeature.QR_CODES);
    void this.webhooks.publish(userId, 'QR_CREATED', { id: qr.id, linkId: qr.linkId });
    return qr;
  }

  async update(userId: string, id: string, input: UpdateQrCodeDto) {
    const tier = await this.tiers.getUserTier(userId);
    if (input.design) this.tiers.requireFeature(tier, 'qrCustomization');
    const existing = await this.prisma.qrCode.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('QR code not found.');
    return this.prisma.qrCode.update({ where: { id }, data: { title: input.title, design: input.design as Prisma.InputJsonValue | undefined } });
  }

  async archive(userId: string, id: string) {
    const existing = await this.prisma.qrCode.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('QR code not found.');
    return this.prisma.qrCode.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async download(userId: string, id: string, response: Response) {
    const qr = await this.prisma.qrCode.findFirst({ where: { id, userId, status: 'ACTIVE' } });
    if (!qr) throw new NotFoundException('QR code not found.');
    return this.sendDataUrl(qr.imageDataUrl, `${qr.id}.${qr.imageFormat}`, response);
  }

  async scan(id: string, context: ClickContext, response: Response) {
    const qr = await this.prisma.qrCode.findUnique({ where: { id }, include: { link: true } });
    if (!qr || qr.status !== 'ACTIVE') throw new NotFoundException('QR code not found.');
    if (!isRedirectable(qr.link)) throw new GoneException('This link has expired or is disabled.');
    await this.prisma.$transaction([
      this.prisma.qrCode.update({ where: { id }, data: { scanCount: { increment: 1 } } }),
      this.prisma.link.update({ where: { id: qr.linkId }, data: { scanCount: { increment: 1 } } }),
    ]);
    this.analytics.trackClick(qr.linkId, context, 'SCAN');
    void this.webhooks.publish(qr.userId, 'QR_SCANNED', { id: qr.id, linkId: qr.linkId });
    return response.redirect(qr.link.redirectType === 'PERMANENT' ? 301 : 302, qr.link.destination);
  }

  private shortUrlForHost(shortHost: string, slug: string) {
    const protocol = shortHost.startsWith('localhost') || shortHost.startsWith('127.0.0.1') ? 'http' : 'https';
    return `${protocol}://${shortHost}/${slug}`;
  }

  private sendDataUrl(dataUrl: string, filename: string, response: Response) {
    const [meta, data] = dataUrl.split(',');
    const contentType = meta.match(/data:(.*);base64/)?.[1] ?? 'image/png';
    response.setHeader('content-type', contentType);
    response.setHeader('content-disposition', `attachment; filename="${filename}"`);
    return response.send(Buffer.from(data, 'base64'));
  }
}
