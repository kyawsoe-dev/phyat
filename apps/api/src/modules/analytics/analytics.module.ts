import { Module } from '@nestjs/common';
import { AnalyticsService } from './application/analytics.service';
import { AnalyticsRepository } from './infrastructure/analytics.repository';
import { AnalyticsController } from './interfaces/analytics.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsRepository, AnalyticsService],
  exports: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}