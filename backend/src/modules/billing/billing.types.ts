import { BillingCycle, DiscountType, UsageMetricType } from '@prisma/client';

export interface SubscriptionEventJobData {
  eventType: string;
  payload: Record<string, any>;
}

export interface BillingSyncJobData {
  triggeredBy: string;
}

export interface InvoiceSyncJobData {
  triggeredBy: string;
}

export interface UsageResetJobData {
  triggeredBy: string;
}

export interface UsageResetResult {
  userId: string;
  creditsGranted: number;
}

export interface CheckoutRequest {
  planSlug: string;
  interval: BillingCycle;
  couponCode?: string;
}

export interface UsageCheckResult {
  metricType: UsageMetricType;
  currentCount: number;
  limit: number | null;
  remaining: number | null;
  periodStart: Date;
  periodEnd: Date;
}

export interface CouponApplyResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    discountType: DiscountType;
    discountValue: number;
    expiresAt: Date | null;
  };
  message?: string;
}
