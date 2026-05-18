import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { DomainsController } from './interfaces/domains.controller';
import { DomainsService } from './application/domains.service';
import { DomainRepository } from './infrastructure/domain.repository';
import { TierCapabilityService } from '../subscriptions/application/tier-capability.service';
import { UsageService } from '../subscriptions/application/usage.service';

@Module({
  imports: [AuthModule],
  controllers: [DomainsController],
  providers: [DomainsService, DomainRepository, TierCapabilityService, UsageService, PrismaService],
  exports: [DomainsService, DomainRepository],
})
export class DomainsModule {}
