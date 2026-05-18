import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../../common/auth/admin.guard';
import { SubscriptionsService } from '../application/subscriptions.service';
import { AdminTierDto, ReorderTiersDto, TierStatusDto, UpgradeDto, RedeemCouponDto } from '../application/dto';

@ApiTags('subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all plans with pricing' })
  getPlans(@Query('includeInactive') includeInactive?: string) {
    return this.subs.getPlans(includeInactive === 'true');
  }

  @Get('subscriptions/current')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current active subscription' })
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.subs.getCurrentSubscription(user.id);
  }

  @Get('usage/current')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current usage against active tier limits' })
  getUsage(@CurrentUser() user: AuthenticatedUser) {
    return this.subs.getCurrentUsage(user.id);
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

  @Post('admin/tiers')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create a dynamic tier' })
  createTier(@Body() input: AdminTierDto) {
    return this.subs.createTier(input);
  }

  @Put('admin/tiers/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update a dynamic tier' })
  updateTier(@Param('id') id: string, @Body() input: AdminTierDto) {
    return this.subs.updateTier(id, input);
  }

  @Patch('admin/tiers/:id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Activate or deactivate a tier' })
  updateTierStatus(@Param('id') id: string, @Body() input: TierStatusDto) {
    return this.subs.setTierStatus(id, input.isActive);
  }

  @Put('admin/tiers/order')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update tier display order' })
  reorderTiers(@Body() input: ReorderTiersDto) {
    return this.subs.reorderTiers(input);
  }
}
