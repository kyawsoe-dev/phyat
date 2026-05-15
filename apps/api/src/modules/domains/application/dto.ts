import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateDomainDto {
  @IsString()
  @Matches(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/, {
    message: 'Invalid domain format',
  })
  @MaxLength(253)
  domain!: string;
}

export class UpdateDomainDto {
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
