import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { CampaignsController } from './interfaces/campaigns.controller';
import { CampaignsService } from './application/campaigns.service';
import { CampaignRepository } from './infrastructure/campaign.repository';

@Module({
  imports: [AuthModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignRepository, PrismaService],
  exports: [CampaignsService, CampaignRepository],
})
export class CampaignsModule {}
