import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CreateWebhookDto, UpdateWebhookDto } from '../application/dto';
import { WebhookAuthGuard } from '../application/webhook-auth.guard';
import { WebhooksService } from '../application/webhooks.service';

@ApiTags('webhooks')
@UseGuards(WebhookAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.webhooks.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateWebhookDto) {
    return this.webhooks.create(user.id, input);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateWebhookDto) {
    return this.webhooks.update(user.id, id, input);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.webhooks.remove(user.id, id);
  }

  @Post(':id/test')
  test(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.webhooks.test(user.id, id);
  }
}
