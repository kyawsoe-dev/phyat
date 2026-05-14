import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AnalyticsService } from './application/analytics.service';
import { AnalyticsRepository } from './infrastructure/analytics.repository';
import { AnalyticsController } from './interfaces/analytics.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsRepository, AnalyticsService, PrismaService],
  exports: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}