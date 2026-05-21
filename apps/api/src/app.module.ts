import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ApiKeyModule } from './modules/api-keys/api-key.module';
import { AuthModule } from './modules/auth/auth.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { DomainsModule } from './modules/domains/domains.module';
import { LinksModule } from './modules/links/links.module';
import { QrCodesModule } from './modules/qr-codes/qr-codes.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { InvoiceModule } from './modules/invoices/invoice.module';
import { UpgradeRequestsModule } from './modules/upgrade-requests/upgrade-requests.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AdminModule, AnalyticsModule, AuthModule, ApiKeyModule, CampaignsModule, DomainsModule, InvoiceModule, LinksModule, QrCodesModule, SubscriptionsModule, UpgradeRequestsModule, WebhooksModule],
})
export class AppModule {}
