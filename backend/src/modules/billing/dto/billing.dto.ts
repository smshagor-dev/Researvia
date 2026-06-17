import { BillingCycle, DiscountType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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

export class CreateNowPaymentsDto {
  @IsString()
  planSlug!: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  interval?: BillingCycle;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  payCurrency?: string;
}

export class ApplyCouponDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  planSlug?: string;
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

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsInt()
  @Min(1)
  discountValue?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePlanDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(50)
  slug!: string;

  @IsOptional()
  @IsString()
  stripePriceIdMonthly?: string;

  @IsOptional()
  @IsString()
  stripePriceIdYearly?: string;

  @IsNumber()
  @Min(0)
  priceMonthly!: number;

  @IsNumber()
  @Min(0)
  priceYearly!: number;

  @IsInt()
  @Min(0)
  creditsPerMonth!: number;

  @IsInt()
  @Min(0)
  emailSendsPerDay!: number;

  @IsInt()
  @Min(0)
  professorRevealsPerMonth!: number;

  @IsInt()
  @Min(0)
  aiGenerationsPerMonth!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  opportunityUnlocksPerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  scholarshipUnlocksPerMonth?: number;

  @IsInt()
  @Min(0)
  maxSavedProfessors!: number;

  @IsInt()
  @Min(0)
  maxSavedScholarships!: number;

  @IsInt()
  @Min(0)
  maxSmtpAccounts!: number;

  @IsInt()
  @Min(0)
  maxOauthAccounts!: number;

  @IsOptional()
  @IsBoolean()
  hasInboxSync?: boolean;

  @IsOptional()
  @IsBoolean()
  hasAiMatchScore?: boolean;

  @IsOptional()
  @IsBoolean()
  hasBulkEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  hasAnalytics?: boolean;

  @IsOptional()
  @IsBoolean()
  hasTeamAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePlanDto extends CreatePlanDto {}
