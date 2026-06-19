import { Controller, Get, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../../common/auth/admin.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { UpgradeRequestsService } from './upgrade-requests.service';

@ApiTags('upgrade-requests')
@Controller()
export class UpgradeRequestsController {
  constructor(private readonly requests: UpgradeRequestsService) {}

  @Post('upgrade-requests')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Request a tier upgrade' })
  create(@CurrentUser() user: AuthenticatedUser, @Body('tierCode') tierCode: string) {
    return this.requests.create(user.id, tierCode);
  }

  @Get('upgrade-requests')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my upgrade requests' })
  getMyRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.requests.getUserRequests(user.id);
  }

  @Get('admin/upgrade-requests')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all upgrade requests' })
  getAllRequests(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.requests.getAllRequests(Number(page), Number(limit), status);
  }

  @Put('upgrade-requests/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel your own pending upgrade request' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.requests.cancel(user.id, id);
  }

  @Put('admin/upgrade-requests/:id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Approve an upgrade request' })
  approve(@Param('id') id: string) {
    return this.requests.approve(id);
  }

  @Put('admin/upgrade-requests/:id/deny')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Deny an upgrade request' })
  deny(@Param('id') id: string, @Body('note') note?: string) {
    return this.requests.deny(id, note);
  }
}
