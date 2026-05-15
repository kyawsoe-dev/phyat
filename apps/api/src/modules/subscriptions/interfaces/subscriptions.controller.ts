import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SubscriptionsService } from '../application/subscriptions.service';
import { UpgradeDto, RedeemCouponDto } from '../application/dto';

@ApiTags('subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all plans with pricing' })
  getPlans() {
    return this.subs.getPlans();
  }

  @Get('subscriptions/current')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current active subscription' })
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.subs.getCurrentSubscription(user.id);
  }

  @Post('subscriptions/upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upgrade to a plan (with optional coupon)' })
  upgrade(@CurrentUser() user: AuthenticatedUser, @Body() input: UpgradeDto) {
    return this.subs.upgrade(user.id, input);
  }

  @Post('subscriptions/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel current subscription' })
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.subs.cancel(user.id);
  }

  @Post('coupons/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Validate and redeem a coupon code' })
  redeem(@CurrentUser() user: AuthenticatedUser, @Body() input: RedeemCouponDto) {
    return this.subs.redeemCoupon(user.id, input.code);
  }
}
