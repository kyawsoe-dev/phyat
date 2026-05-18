import { IsArray, IsBoolean, IsDateString, IsIn, IsObject, IsOptional, IsString, IsUrl, Length, Matches, MaxLength } from 'class-validator';

export class CreateLinkDto {
  @IsUrl({ require_protocol: true })
  destination!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  utmParams?: Record<string, string>;

  @IsOptional()
  @IsObject()
  customParams?: Record<string, string>;

  @IsOptional()
  @IsIn(['TEMPORARY', 'PERMANENT'])
  redirectType?: 'TEMPORARY' | 'PERMANENT';

  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]{3,48}$/)
  customAlias?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @Length(6, 128)
  password?: string;

  @IsOptional()
  @IsBoolean()
  generateQR?: boolean;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  domainId?: string;
}

export class VerifyPasswordDto {
  @IsString()
  @Length(1, 128)
  password!: string;
}

export class UpdateLinkDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @Length(6, 128)
  password?: string;

  @IsOptional()
  @IsBoolean()
  removePassword?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  destination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  utmParams?: Record<string, string>;

  @IsOptional()
  @IsObject()
  customParams?: Record<string, string>;

  @IsOptional()
  @IsIn(['TEMPORARY', 'PERMANENT'])
  redirectType?: 'TEMPORARY' | 'PERMANENT';

  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]{3,48}$/)
  customAlias?: string;

  @IsOptional()
  @IsString()
  domainId?: string;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export type ClickContext = {
  userAgent?: string;
  referrer?: string;
  ip?: string;
};
