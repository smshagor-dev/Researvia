import { BillingCycle, DiscountType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CheckoutDto {
  @IsString()
  planSlug!: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  interval?: BillingCycle;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class ApplyCouponDto {
  @IsString()
  code!: string;
}

export class CreateCouponDto {
  @IsString()
  @MaxLength(100)
  code!: string;

  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @IsInt()
  @Min(1)
  discountValue!: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;
}
