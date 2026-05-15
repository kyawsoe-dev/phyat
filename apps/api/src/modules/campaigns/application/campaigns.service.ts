import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCampaignDto, UpdateCampaignDto } from './dto';
import { CampaignRepository } from '../infrastructure/campaign.repository';

@Injectable()
export class CampaignsService {
  constructor(private readonly campaigns: CampaignRepository) {}

  async create(userId: string, input: CreateCampaignDto) {
    return this.campaigns.create(userId, input);
  }

  async list(userId: string) {
    return this.campaigns.listByUser(userId);
  }

  async get(id: string, userId: string) {
    const campaign = await this.campaigns.findById(id, userId);
    if (!campaign) throw new NotFoundException('Campaign not found.');
    return campaign;
  }

  async update(id: string, userId: string, input: UpdateCampaignDto) {
    const campaign = await this.campaigns.findById(id, userId);
    if (!campaign) throw new NotFoundException('Campaign not found.');
    return this.campaigns.update(id, userId, input);
  }

  async remove(id: string, userId: string) {
    const campaign = await this.campaigns.findById(id, userId);
    if (!campaign) throw new NotFoundException('Campaign not found.');
    return this.campaigns.delete(id, userId);
  }

  async getLinks(campaignId: string, userId: string) {
    const campaign = await this.campaigns.findById(campaignId, userId);
    if (!campaign) throw new NotFoundException('Campaign not found.');
    return this.campaigns.listLinks(campaignId, userId);
  }

  async getStats(campaignId: string, userId: string) {
    const campaign = await this.campaigns.findById(campaignId, userId);
    if (!campaign) throw new NotFoundException('Campaign not found.');
    return this.campaigns.getAggregatedStats(campaignId, userId);
  }

  async assignLink(campaignId: string, linkId: string, userId: string) {
    const campaign = await this.campaigns.findById(campaignId, userId);
    if (!campaign) throw new NotFoundException('Campaign not found.');
    return this.campaigns.assignLink(campaignId, linkId, userId);
  }

  async unassignLink(campaignId: string, linkId: string, userId: string) {
    const campaign = await this.campaigns.findById(campaignId, userId);
    if (!campaign) throw new NotFoundException('Campaign not found.');
    return this.campaigns.unassignLink(campaignId, linkId, userId);
  }
}
