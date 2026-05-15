import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { DomainsController } from './interfaces/domains.controller';
import { DomainsService } from './application/domains.service';
import { DomainRepository } from './infrastructure/domain.repository';

@Module({
  imports: [AuthModule],
  controllers: [DomainsController],
  providers: [DomainsService, DomainRepository, PrismaService],
  exports: [DomainsService, DomainRepository],
})
export class DomainsModule {}
