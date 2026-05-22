import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WebhookEvent, UsageFeature } from '@prisma/client';
import { createHmac, randomBytes } from 'crypto';
import { PrismaService } from '../../../common/prisma.service';
import { TierCapabilityService } from '../../subscriptions/application/tier-capability.service';
import { UsageService } from '../../subscriptions/application/usage.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tiers: TierCapabilityService,
    private readonly usage: UsageService,
  ) {}

  list(userId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, url: true, events: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }

  async create(userId: string, input: CreateWebhookDto) {
    const tier = await this.tiers.getUserTier(userId);
    this.tiers.requireFeature(tier, 'webhooks');
    const count = await this.prisma.webhookEndpoint.count({ where: { userId } });
    this.tiers.requireLimit(tier, 'maxWebhooks', count);
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: { userId, name: input.name, url: input.url, events: input.events, secret: randomBytes(24).toString('base64url') },
      select: { id: true, name: true, url: true, events: true, isActive: true, secret: true, createdAt: true },
    });
    await this.usage.increment(userId, tier.id, UsageFeature.WEBHOOKS);
    return endpoint;
  }

  async update(userId: string, id: string, input: UpdateWebhookDto) {
    const existing = await this.prisma.webhookEndpoint.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Webhook not found.');
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: input,
      select: { id: true, name: true, url: true, events: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.webhookEndpoint.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Webhook not found.');
    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async test(userId: string, id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id, userId } });
    if (!endpoint) throw new NotFoundException('Webhook not found.');
    return this.deliver(endpoint.id, 'LINK_CREATED', { test: true, endpointId: id, sentAt: new Date().toISOString() });
  }

  async publish(userId: string, event: WebhookEvent, payload: Record<string, unknown>) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({ where: { userId, isActive: true, events: { has: event } } });
    await Promise.all(endpoints.map((endpoint) => this.deliver(endpoint.id, event, payload)));
  }

  private async deliver(endpointId: string, event: WebhookEvent, payload: Record<string, unknown>) {
    const endpoint = await this.prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpointId } });
    const body = JSON.stringify({ event, payload, createdAt: new Date().toISOString() });
    const signature = createHmac('sha256', endpoint.secret).update(body).digest('hex');
    const delivery = await this.prisma.webhookDelivery.create({ data: { endpointId, event, payload: payload as Prisma.InputJsonValue } });
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-phyat-event': event, 'x-phyat-signature': signature },
        body,
        signal: AbortSignal.timeout(5000),
      });
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { attempts: 1, status: response.ok ? 'DELIVERED' : 'FAILED', deliveredAt: response.ok ? new Date() : null, lastError: response.ok ? null : `HTTP ${response.status}` },
      });
      await this.usage.increment(endpoint.userId, await this.userTierId(endpoint.userId), UsageFeature.WEBHOOK_DELIVERIES);
      return { success: response.ok, status: response.status };
    } catch (error) {
      await this.prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { attempts: 1, status: 'FAILED', lastError: String(error) } });
      return { success: false, error: String(error) };
    }
  }

  private async userTierId(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { tierId: true } });
    return user.tierId;
  }
}
