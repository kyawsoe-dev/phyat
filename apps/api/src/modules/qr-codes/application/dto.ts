import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateQrCodeDto {
  @IsString()
  linkId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsObject()
  design?: Record<string, unknown>;
}

export class UpdateQrCodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsObject()
  design?: Record<string, unknown>;
}
