import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ApiKeyModule } from './modules/api-keys/api-key.module';
import { AuthModule } from './modules/auth/auth.module';
import { LinksModule } from './modules/links/links.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AnalyticsModule, AuthModule, ApiKeyModule, LinksModule],
})
export class AppModule {}
