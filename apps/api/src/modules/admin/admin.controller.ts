import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../../common/auth/admin.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard overview stats' })
  getDashboard() {
    return this.admin.getDashboardStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health metrics' })
  getHealth() {
    return this.admin.getSystemHealth();
  }

  @Get('2fa/setup')
  @ApiOperation({ summary: 'Get 2FA setup data (secret + QR URL)' })
  get2faSetup(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.get2faSetup(user.id);
  }

  @Post('2fa/verify-setup')
  @ApiOperation({ summary: 'Verify and enable 2FA with TOTP token' })
  verify2faSetup(@CurrentUser() user: AuthenticatedUser, @Body('token') token: string) {
    return this.admin.verify2faSetup(user.id, token);
  }

  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify 2FA token for login session' })
  verify2fa(@CurrentUser() user: AuthenticatedUser, @Body('token') token: string) {
    return this.admin.verify2faLogin(user.id, token);
  }

  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disable 2FA (requires password)' })
  disable2fa(@CurrentUser() user: AuthenticatedUser, @Body('password') password: string) {
    return this.admin.disable2fa(user.id, password);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination' })
  getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('tier') tier?: string,
  ) {
    return this.admin.getUsers(Number(page), Number(limit), search, tier);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  getUser(@Param('id') id: string) {
    return this.admin.getUserDetail(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user (name, tier, admin status)' })
  updateUser(
    @Param('id') id: string,
    @Body() data: { name?: string; tierCode?: string; isAdmin?: boolean },
  ) {
    return this.admin.updateUser(id, data);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }

  @Get('links')
  @ApiOperation({ summary: 'List all links with pagination' })
  getLinks(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.admin.getAllLinks(Number(page), Number(limit), search);
  }

  @Delete('links/:id')
  @ApiOperation({ summary: 'Delete any link' })
  deleteLink(@Param('id') id: string) {
    return this.admin.deleteLinkById(id);
  }

  @Put('links/:id')
  @ApiOperation({ summary: 'Update any link (admin moderation)' })
  updateLink(
    @Param('id') id: string,
    @Body() data: {
      title?: string;
      notes?: string;
      destination?: string;
      status?: 'ACTIVE' | 'DISABLED';
      tags?: string[];
    },
  ) {
    return this.admin.updateLink(id, data);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get admin-level analytics' })
  getAnalytics(@Query('days') days = '30') {
    return this.admin.getAdminAnalytics(Number(days));
  }

  @Get('tiers')
  @ApiOperation({ summary: 'List all tiers' })
  getTiers() {
    return this.admin.getTiers();
  }

  @Put('tiers/:id')
  @ApiOperation({ summary: 'Update a tier' })
  updateTier(
    @Param('id') id: string,
    @Body() data: { name?: string; priceMonthly?: number; priceAnnual?: number; isActive?: boolean },
  ) {
    return this.admin.updateTier(id, data);
  }
}
