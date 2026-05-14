import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AnalyticsService } from '../application/analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('links/:linkId')
  @ApiOperation({ summary: 'Get click analytics for a link' })
  @ApiResponse({ status: 200, description: 'Returns click data' })
  getClicks(@Param('linkId') linkId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.analytics.getClicks(linkId, user.id);
  }

  @Get('links/:linkId/stats')
  @ApiOperation({ summary: 'Get statistics for a link' })
  @ApiResponse({ status: 200, description: 'Returns link statistics' })
  getStats(@Param('linkId') linkId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.analytics.getStats(linkId, user.id);
  }
}