import { IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

const events = ['LINK_CREATED', 'LINK_UPDATED', 'LINK_DELETED', 'LINK_CLICKED', 'QR_CREATED', 'QR_SCANNED'] as const;

export class CreateWebhookDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsUrl({ require_protocol: true })
  url!: string;

  @IsArray()
  @IsIn(events, { each: true })
  events!: Array<typeof events[number]>;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @IsOptional()
  @IsArray()
  @IsIn(events, { each: true })
  events?: Array<typeof events[number]>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
