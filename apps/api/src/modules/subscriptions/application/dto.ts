import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpgradeDto {
  @ApiProperty({ enum: ['PRO', 'DEVELOPER'] })
  @IsIn(['FREE', 'PRO', 'DEVELOPER'])
  tierCode!: 'FREE' | 'PRO' | 'DEVELOPER';

  @ApiProperty({ enum: ['MONTHLY', 'ANNUAL'], default: 'MONTHLY' })
  @IsIn(['MONTHLY', 'ANNUAL'])
  billingCycle!: 'MONTHLY' | 'ANNUAL';
}

export class RedeemCouponDto {
  @ApiProperty()
  @IsString()
  code!: string;
}

export class PlanResponse {
  code!: string;
  name!: string;
  description!: string;
  priceMonthly!: number;
  priceAnnual!: number;
  maxLinks!: number | null;
  features!: string[];
  annualDiscountPercent!: number;
}

export class SubscriptionResponse {
  id!: string;
  tierCode!: string;
  tierName!: string;
  status!: string;
  billingCycle!: string;
  currentPeriodStart!: string;
  currentPeriodEnd!: string;
  canceledAt!: string | null;
  createdAt!: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

export class CouponResponse {
  valid!: boolean;
  discountPercent!: number;
  code?: string;
  message?: string;
}


export class AdminTierDto {
  @IsIn(['FREE', 'PRO', 'DEVELOPER'])
  code!: 'FREE' | 'PRO' | 'DEVELOPER';

  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @IsOptional() @IsInt() @Min(0) maxLinksPerMonth?: number | null;
  @IsOptional() @IsInt() @Min(0) maxQrCodesPerMonth?: number | null;
  @IsOptional() @IsInt() @Min(0) maxCustomDomains?: number | null;
  @IsOptional() @IsInt() @Min(0) maxApiKeys?: number | null;
  @IsOptional() @IsInt() @Min(0) maxWebhooks?: number | null;
  @IsOptional() @IsInt() @Min(0) bulkCreateLimit?: number | null;
  @IsOptional() @IsInt() @Min(0) analyticsRetentionDays?: number | null;
  @IsOptional() @IsInt() @Min(0) apiRateLimitPerMinute?: number | null;
  @IsOptional() @IsInt() @Min(0) priceMonthly?: number | null;
  @IsOptional() @IsInt() @Min(0) priceAnnual?: number | null;
  @IsInt() @Min(0) annualDiscountPercent!: number;
  @IsBoolean() customDomains!: boolean;
  @IsBoolean() apiAccess!: boolean;
  @IsBoolean() webhooks!: boolean;
  @IsBoolean() advancedAnalytics!: boolean;
  @IsBoolean() utmBuilder!: boolean;
  @IsBoolean() qrCustomization!: boolean;
  @IsBoolean() bulkImport!: boolean;
  @IsBoolean() exportData!: boolean;
  @IsBoolean() campaignsEnabled!: boolean;
  @IsBoolean() isActive!: boolean;
  @IsBoolean() isPublic!: boolean;
  @IsInt() @Min(0) sortOrder!: number;
}

export class TierStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class ReorderTierItemDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderTiersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderTierItemDto)
  items!: ReorderTierItemDto[];
}
