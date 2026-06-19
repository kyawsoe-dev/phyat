import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { InvoiceModule } from '../invoices/invoice.module';
import { UpgradeRequestsController } from './upgrade-requests.controller';
import { UpgradeRequestsService } from './upgrade-requests.service';

@Module({
  imports: [AuthModule, SubscriptionsModule, InvoiceModule],
  controllers: [UpgradeRequestsController],
  providers: [UpgradeRequestsService],
  exports: [UpgradeRequestsService],
})
export class UpgradeRequestsModule {}
