import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { IsEmail, IsOptional, IsString, MaxLength, Min } from 'class-validator';

class AdminCreateUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  tierCode?: string;
}

class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  tierCode?: string;
}

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

  @Post('users')
  @ApiOperation({ summary: 'Create a new user (non-admin by default)' })
  createUser(@Body() data: AdminCreateUserDto) {
    return this.admin.createUser({ ...data, isAdmin: false });
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination' })
  getUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('search') search?: string,
    @Query('tier') tier?: string,
  ) {
    return this.admin.getUsers(page, limit, search, tier);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  getUser(@Param('id') id: string) {
    return this.admin.getUserDetail(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user (name, tier)' })
  updateUser(
    @Param('id') id: string,
    @Body() data: AdminUpdateUserDto,
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
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('search') search?: string,
  ) {
    return this.admin.getAllLinks(page, limit, search);
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

  @Get('users/:id/analytics')
  @ApiOperation({ summary: 'Get per-user aggregated analytics' })
  getUserAnalytics(@Param('id') id: string) {
    return this.admin.getUserAnalytics(id);
  }

  @Get('analytics/links/:id')
  @ApiOperation({ summary: 'Get per-link click list (admin bypass)' })
  getLinkAnalytics(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.admin.getLinkAnalytics(id, page, limit);
  }

  @Get('analytics/links/:id/stats')
  @ApiOperation({ summary: 'Get per-link stats (admin bypass)' })
  getLinkAnalyticsStats(@Param('id') id: string) {
    return this.admin.getLinkAnalyticsStats(id);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get admin-level analytics' })
  getAnalytics(@Query('days', new ParseIntPipe({ optional: true })) days = 30) {
    return this.admin.getAdminAnalytics(days);
  }

  @Get('analytics/export')
  @ApiOperation({ summary: 'Export analytics data as JSON (CSV-ready)' })
  exportAnalytics(@Query('days', new ParseIntPipe({ optional: true })) days = 30) {
    return this.admin.exportAnalytics(days);
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
