import { Body, Controller, Delete, Get, Headers, Ip, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TierLimitGuard } from '../../subscriptions/tier-limit.guard';
import { CreateLinkDto, UpdateLinkDto, VerifyPasswordDto } from '../application/dto';
import { LinksService } from '../application/links.service';
import { RedirectService } from '../application/redirect.service';

@ApiTags('links')
@Controller()
export class LinksController {
  constructor(
    private readonly links: LinksService,
    private readonly redirects: RedirectService,
  ) {}

  @UseGuards(JwtAuthGuard, TierLimitGuard)
  @Post('links')
  @ApiOperation({ summary: 'Create a short link' })
  @ApiResponse({ status: 201, description: 'Link created successfully' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateLinkDto) {
    return this.links.create(user.id, input);
  }

  @UseGuards(JwtAuthGuard)
  @Get('links')
  @ApiOperation({ summary: 'List user links with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of links' })
  list(@CurrentUser() user: AuthenticatedUser, @Query('cursor') cursor?: string) {
    return this.links.listDashboardLinks(user.id, cursor);
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
  metadata(@Param('slug') slug: string) {
    return this.links.getGatewayMetadata(slug);
  }

  @Get('r/:slug')
  @ApiOperation({ summary: 'Redirect to the original URL (internal)' })
  async redirect(
    @Param('slug') slug: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('referer') referrer: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Ip() ip: string | undefined,
    @Res() response: Response,
  ) {
    const result = await this.redirects.resolve(slug, { userAgent, referrer, ip: forwardedFor ?? ip });
    return response.redirect(result.statusCode, result.destination);
  }

  @Post('links/:slug/password')
  @ApiOperation({ summary: 'Submit password for protected link' })
  @ApiResponse({ status: 200, description: 'Returns redirect destination if password correct' })
  async passwordRedirect(
    @Param('slug') slug: string,
    @Body() body: VerifyPasswordDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('referer') referrer: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Ip() ip: string | undefined,
  ) {
    return this.redirects.resolve(slug, { userAgent, referrer, ip: forwardedFor ?? ip }, body.password);
  }
}
