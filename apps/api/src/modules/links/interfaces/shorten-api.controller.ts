import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { ApiKeyGuard } from '../../api-keys/api-key.guard';
import { TierLimitGuard } from '../../subscriptions/tier-limit.guard';
import { CreateLinkDto } from '../application/dto';
import { LinksService } from '../application/links.service';

@Controller('api/v1')
export class ShortenApiController {
  constructor(private readonly links: LinksService) {}

  @UseGuards(ApiKeyGuard, TierLimitGuard)
  @Post('shorten')
  async shorten(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateLinkDto,
    @Headers('host') host: string | undefined,
  ) {
    const link = await this.links.create(user.id, input);

    return {
      id: link.id,
      slug: link.slug,
      shortUrl: `${process.env.PUBLIC_SHORT_URL ?? `https://${host}`}/${link.slug}`,
      destination: link.destination,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    };
  }
}
