import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateCampaignDto, UpdateCampaignDto } from '../application/dto';
import { CampaignsService } from '../application/campaigns.service';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a campaign' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateCampaignDto) {
    return this.campaigns.create(user.id, input);
  }

  @Get()
  @ApiOperation({ summary: 'List user campaigns' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.campaigns.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaigns.get(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a campaign' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateCampaignDto) {
    return this.campaigns.update(id, user.id, input);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaigns.remove(id, user.id);
  }

  @Get(':id/links')
  @ApiOperation({ summary: 'Get links in a campaign' })
  getLinks(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaigns.getLinks(id, user.id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get campaign aggregated stats' })
  getStats(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaigns.getStats(id, user.id);
  }

  @Post(':id/links/:linkId')
  @ApiOperation({ summary: 'Assign a link to campaign' })
  assignLink(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.campaigns.assignLink(id, linkId, user.id);
  }

  @Delete(':id/links/:linkId')
  @ApiOperation({ summary: 'Unassign a link from campaign' })
  unassignLink(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.campaigns.unassignLink(id, linkId, user.id);
  }
}
