import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateDomainDto, UpdateDomainDto } from '../application/dto';
import { DomainsService } from '../application/domains.service';

@ApiTags('domains')
@Controller('domains')
@UseGuards(JwtAuthGuard)
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a custom domain' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateDomainDto) {
    return this.domains.create(user.id, input);
  }

  @Get()
  @ApiOperation({ summary: 'List user domains' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.domains.list(user.id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify domain ownership via DNS TXT record' })
  verify(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.domains.verify(user.id, id);
  }

  @Put(':id/default')
  @ApiOperation({ summary: 'Set domain as default' })
  setDefault(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.domains.setDefault(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a domain' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.domains.remove(user.id, id);
  }
}
