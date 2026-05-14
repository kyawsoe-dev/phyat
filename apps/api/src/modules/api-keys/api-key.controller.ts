import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyService } from './api-key.service';

class CreateApiKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

@ApiTags('api-keys')
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeys: ApiKeyService) {}

  @Get()
  @ApiOperation({ summary: 'List API keys for current user' })
  @ApiResponse({ status: 200, description: 'Returns list of API keys' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.apiKeys.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateApiKeyDto) {
    return this.apiKeys.create(user.id, body.name);
  }
}
