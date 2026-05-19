import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { UsageFeature } from '@prisma/client';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TierLimitGuard } from '../../subscriptions/tier-limit.guard';
import { CreateLinkDto, UpdateLinkDto, VerifyPasswordDto } from '../application/dto';
import { LinksService } from '../application/links.service';
import { RedirectService } from '../application/redirect.service';
import { TierCapabilityService } from '../../subscriptions/application/tier-capability.service';
import { UsageService } from '../../subscriptions/application/usage.service';

@ApiTags('links')
@Controller()
export class LinksController {
  constructor(
    private readonly links: LinksService,
    private readonly redirects: RedirectService,
    private readonly tiers: TierCapabilityService,
    private readonly usage: UsageService,
  ) {}

  @UseGuards(JwtAuthGuard, TierLimitGuard)
  @Post('links')
  @ApiOperation({ summary: 'Create a short link' })
  @ApiResponse({ status: 201, description: 'Link created successfully' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateLinkDto) {
    return this.links.create(user.id, input);
  }

  @UseGuards(JwtAuthGuard, TierLimitGuard)
  @Post('links/bulk')
  @ApiOperation({ summary: 'Bulk create short links' })
  @ApiResponse({ status: 201, description: 'Links created successfully' })
  async createBulk(@CurrentUser() user: AuthenticatedUser, @Body() inputs: CreateLinkDto[]) {
    const tier = await this.tiers.getUserTier(user.id);
    this.tiers.requireFeature(tier, 'bulkImport');
    this.tiers.requireLimit(tier, 'bulkCreateLimit', 0, inputs.length);
    const results = [];
    const errors: { index: number; error: string }[] = [];
    for (let i = 0; i < inputs.length; i++) {
      try {
        const link = await this.links.create(user.id, inputs[i]);
        results.push(link);
      } catch (e) {
        errors.push({ index: i, error: (e as Error).message });
      }
    }
    await this.usage.increment(user.id, tier.id, UsageFeature.BULK_ROWS, inputs.length);
    return { data: results, errors };
  }

  @UseGuards(JwtAuthGuard)
  @Get('links')
  @ApiOperation({ summary: 'List user links with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of links' })
  list(@CurrentUser() user: AuthenticatedUser, @Query('cursor') cursor?: string) {
    return this.links.listDashboardLinks(user.id, cursor);
  }

  @UseGuards(JwtAuthGuard)
  @Get('links/export')
  @ApiOperation({ summary: 'Export user links as CSV' })
  async export(@CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    const csv = await this.links.exportLinks(user.id);
    response.setHeader('content-type', 'text/csv; charset=utf-8');
    response.setHeader('content-disposition', 'attachment; filename="phyat-links.csv"');
    return response.send(csv);
  }

  @UseGuards(JwtAuthGuard)
  @Put('links/:id')
  @ApiOperation({ summary: 'Update a link' })
  @ApiResponse({ status: 200, description: 'Link updated successfully' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateLinkDto) {
    return this.links.update(user.id, id, input);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('links/:id')
  @ApiOperation({ summary: 'Delete a link' })
  @ApiResponse({ status: 200, description: 'Link deleted successfully' })
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.links.delete(user.id, id);
  }

  @Get('links/:slug/meta')
  @ApiOperation({ summary: 'Get link metadata for redirect page' })
  @ApiResponse({ status: 200, description: 'Returns link metadata' })
  metadata(@Param('slug') slug: string, @Query('shortHost') shortHost: string | undefined) {
    return this.links.getGatewayMetadata(slug, shortHost);
  }

  private extractClientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ip?.trim() || undefined;
    }
    return req.ip || req.socket?.remoteAddress || undefined;
  }

  @Get('r/:slug')
  @ApiOperation({ summary: 'Redirect to the original URL (internal)' })
  async redirect(
    @Param('slug') slug: string,
    @Query('shortHost') shortHost: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('referer') referrer: string | undefined,
    @Req() req: Request,
    @Res() response: Response,
  ) {
    const clientIp = this.extractClientIp(req);
    const result = await this.redirects.resolve(slug, { userAgent, referrer, ip: clientIp }, undefined, shortHost);
    return response.redirect(result.statusCode, result.destination);
  }

  @Post('links/:slug/password')
  @ApiOperation({ summary: 'Submit password for protected link' })
  @ApiResponse({ status: 200, description: 'Returns redirect destination if password correct' })
  async passwordRedirect(
    @Param('slug') slug: string,
    @Query('shortHost') shortHost: string | undefined,
    @Body() body: VerifyPasswordDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('referer') referrer: string | undefined,
    @Req() req: Request,
  ) {
    const clientIp = this.extractClientIp(req);
    return this.redirects.resolve(slug, { userAgent, referrer, ip: clientIp }, body.password, shortHost);
  }
}
