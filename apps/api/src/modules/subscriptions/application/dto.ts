import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Min } from 'class-validator';

export class UpgradeDto {
  @ApiProperty({ enum: ['PRO', 'DEVELOPER'] })
  @IsIn(['PRO', 'DEVELOPER'])
  tierCode!: 'PRO' | 'DEVELOPER';

  @ApiProperty({ enum: ['MONTHLY', 'ANNUAL'], default: 'MONTHLY' })
  @IsIn(['MONTHLY', 'ANNUAL'])
  billingCycle!: 'MONTHLY' | 'ANNUAL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
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
}

export class CouponResponse {
  valid!: boolean;
  discountPercent!: number;
  code?: string;
  message?: string;
}
