import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  DiscountType,
  InvoiceStatus,
  PaymentTransactionStatus,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';
import { SyncLogsService } from '../sync-logs/sync-logs.service';
import { CreditsService } from '../credits/credits.service';
import { AuditLogService } from '../security/audit-log.service';
import { stripeWebhookFailureCounter } from '../observability/metrics.registry';
import { UsageMeteringService } from './usage-metering.service';
import { NowPaymentsService } from './nowpayments.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import {
  BILLING_SYNC_JOB,
  BILLING_SYNC_QUEUE,
  INVOICE_SYNC_JOB,
  INVOICE_SYNC_QUEUE,
  SUBSCRIPTION_EVENT_JOB,
  SUBSCRIPTION_EVENTS_QUEUE,
  USAGE_RESET_JOB,
  USAGE_RESET_QUEUE,
} from './billing.constants';
import {
  BillingSyncJobData,
  CheckoutRequest,
  CouponApplyResult,
  InvoiceSyncJobData,
  NowPaymentsCreateRequest,
  SubscriptionEventJobData,
  UsageResetJobData,
} from './billing.types';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripeClient: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly usage: UsageMeteringService,
    private readonly notifications: NotificationsService,
    private readonly queues: ProfessorSyncQueueService,
    private readonly syncLogs: SyncLogsService,
    private readonly credits: CreditsService,
    private readonly audit: AuditLogService,
    private readonly nowPayments: NowPaymentsService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  async getBillingOverview(userId: string) {
    const [subscription, credits, invoices, usage, plans, paymentMethods, paymentTransactions, team, promotions] = await Promise.all([
      this.getUserSubscription(userId),
      this.credits.getBalance(userId),
      this.getInvoices(userId),
      this.usage.getUsageSummary(userId),
      this.getPlans(),
      this.getPaymentMethods(),
      this.prisma.paymentTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.team.findFirst({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        include: { members: { include: { user: { select: { id: true, fullName: true, email: true } } } }, plan: true },
      }),
      this.listPublicPromotions(),
    ]);

    return {
      subscription,
      credits,
      usage,
      invoices,
      team,
      plans,
      promotions,
      paymentMethods,
      paymentTransactions,
    };
  }

  async getPaymentMethods() {
    return {
      defaultProvider: this.isStripeEnabled() ? 'stripe' : this.nowPayments.isEnabled() ? 'nowpayments' : null,
      methods: [
        {
          provider: 'stripe',
          enabled: this.isStripeEnabled(),
          kind: 'card',
          label: 'Card / Stripe',
          isDefault: this.isStripeEnabled(),
          activationMode: 'env-secrets',
          requirements: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
        },
        {
          ...(await this.nowPayments.getPaymentMethodConfig()),
          kind: 'crypto',
          label: 'Crypto / NOWPayments',
          isDefault: !this.isStripeEnabled() && this.nowPayments.isEnabled(),
          activationMode: 'env-secrets',
          requirements: ['NOWPAYMENTS_API_KEY', 'NOWPAYMENTS_IPN_SECRET'],
        },
      ],
    };
  }

  async getInvoices(userId: string) {
    return this.prisma.billingInvoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUsage(userId: string) {
    return this.usage.getUsageSummary(userId);
  }

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getUserSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing', 'past_due', 'paused'] } },
      include: { plan: true, invoices: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCheckoutSession(userId: string, request: CheckoutRequest) {
    const interval = request.interval || BillingCycle.monthly;
    const [plan, user, couponCheck] = await Promise.all([
      this.prisma.subscriptionPlan.findFirst({ where: { slug: request.planSlug, isActive: true } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
      request.couponCode
        ? this.applyCoupon(userId, request.couponCode, { persist: false, planSlug: request.planSlug })
        : Promise.resolve({ valid: false } as CouponApplyResult),
    ]);

    if (!plan) throw new NotFoundException('Plan not found');
    if (!user) throw new NotFoundException('User not found');
    if (plan.slug === 'free') {
      throw new BadRequestException('Free plan does not require checkout');
    }

    const stripe = this.getStripeClient();
    if (!stripe) {
      throw new ServiceUnavailableException('Stripe checkout is not configured');
    }

    const priceId = await this.resolvePriceId(plan, interval);
    if (!priceId) {
      throw new BadRequestException('Selected plan is not configured for Stripe yet');
    }

    const currentSub = await this.prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    let customerId = currentSub?.stripeCustomerId || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const discounts = couponCheck.valid && couponCheck.coupon?.code
      ? await this.resolveStripeDiscounts(couponCheck.coupon.code)
      : undefined;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      discounts,
      success_url: `${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/billing?success=true`,
      cancel_url: `${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/billing?canceled=true`,
      metadata: {
        userId,
        planId: plan.id,
        planSlug: plan.slug,
        billingCycle: interval,
        couponCode: couponCheck.valid ? couponCheck.coupon?.code || '' : '',
      },
      subscription_data: {
        metadata: {
          userId,
          planId: plan.id,
          planSlug: plan.slug,
          billingCycle: interval,
          couponCode: couponCheck.valid ? couponCheck.coupon?.code || '' : '',
        },
      },
    });

    await this.audit.logUserAction({
      userId,
      action: 'billing.checkout_started',
      entityType: 'subscription',
      metadata: { planSlug: plan.slug, billingCycle: interval, sessionId: session.id },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  async createBillingPortal(userId: string) {
    const stripe = this.getStripeClient();
    const subscription = await this.getUserSubscription(userId);
    if (!stripe || !subscription?.stripeCustomerId) {
      return { url: null };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/billing`,
    });

    return { url: session.url };
  }

  async createNowPaymentsPayment(userId: string, request: NowPaymentsCreateRequest) {
    const interval = request.interval || BillingCycle.monthly;
    const [plan, user, couponCheck] = await Promise.all([
      this.prisma.subscriptionPlan.findFirst({ where: { slug: request.planSlug, isActive: true } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
      request.couponCode
        ? this.applyCoupon(userId, request.couponCode, { planSlug: request.planSlug })
        : Promise.resolve({ valid: false } as CouponApplyResult),
    ]);

    if (!plan) throw new NotFoundException('Plan not found');
    if (!user) throw new NotFoundException('User not found');
    if (plan.slug === 'free') {
      throw new BadRequestException('Free plan does not require payment');
    }
    if (!this.nowPayments.isEnabled()) {
      throw new ServiceUnavailableException('NOWPayments is not configured');
    }

    const amount = this.calculatePlanAmount(plan, interval, couponCheck.valid ? couponCheck.coupon : undefined);
    if (amount <= 0) {
      throw new BadRequestException('Selected plan amount must be greater than zero for crypto checkout');
    }

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        provider: 'nowpayments',
        planId: plan.id,
        amount,
        currency: 'usd',
        cryptoCurrency: request.payCurrency?.toLowerCase() || null,
        status: PaymentTransactionStatus.pending,
        metadataJson: {
          planSlug: plan.slug,
          billingCycle: interval,
          couponCode: couponCheck.valid ? couponCheck.coupon?.code || '' : '',
          provider: 'nowpayments',
        } as Prisma.InputJsonValue,
      },
    });

    const invoice = await this.nowPayments.createInvoice({
      orderId: transaction.id,
      priceAmount: amount,
      priceCurrency: 'usd',
      payCurrency: request.payCurrency,
      orderDescription: `${plan.name} ${interval} plan for ${user.email}`,
    });

    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        providerInvoiceId: invoice.id ? String(invoice.id) : null,
        providerPaymentId: invoice.payment_id ? String(invoice.payment_id) : null,
        metadataJson: {
          ...(transaction.metadataJson && typeof transaction.metadataJson === 'object'
            ? transaction.metadataJson as Record<string, unknown>
            : {}),
          invoiceUrl: invoice.invoice_url || null,
          payAddress: invoice.pay_address || null,
          paymentStatus: invoice.payment_status || null,
          providerPayload: invoice,
        } as Prisma.InputJsonValue,
      },
    });

    await this.audit.logUserAction({
      userId,
      action: 'billing.nowpayments_created',
      entityType: 'payment_transaction',
      entityId: transaction.id,
      metadata: { planSlug: plan.slug, interval, amount, cryptoCurrency: request.payCurrency || null },
    });

    return {
      provider: 'nowpayments',
      transactionId: transaction.id,
      providerInvoiceId: invoice.id ? String(invoice.id) : null,
      checkoutUrl: invoice.invoice_url || null,
      payAddress: invoice.pay_address || null,
      amount,
      currency: 'usd',
    };
  }

  async cancelSubscription(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing', 'past_due'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) throw new NotFoundException('No active subscription');

    const stripe = this.getStripeClient();
    if (stripe && sub.stripeSubscriptionId) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    }

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
    });
    await this.audit.logUserAction({
      userId,
      action: 'billing.subscription_cancelled',
      entityType: 'subscription',
      entityId: sub.id,
      metadata: { stripeSubscriptionId: sub.stripeSubscriptionId },
    });
    return updated;
  }

  async applyCoupon(
    userId: string,
    code: string,
    options: { persist?: boolean; planSlug?: string } = {},
  ): Promise<CouponApplyResult> {
    const normalizedCode = this.normalizeCouponCode(code);
    if (!normalizedCode) {
      return { valid: false, message: 'Coupon code is required' };
    }

    const coupon = await this.prisma.coupon.findUnique({ where: { code: normalizedCode } });
    if (!coupon || !coupon.isActive) {
      return { valid: false, message: 'Coupon not found or inactive' };
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      return { valid: false, message: 'Coupon expired' };
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, message: 'Coupon usage limit reached' };
    }
    const existingRedemption = await this.prisma.couponRedemption.findFirst({
      where: { couponId: coupon.id, userId },
      select: { id: true },
    });
    if (existingRedemption) {
      return { valid: false, message: 'Coupon already redeemed for this account' };
    }

    if (options.planSlug) {
      const targetPlan = await this.prisma.subscriptionPlan.findFirst({
        where: { slug: options.planSlug, isActive: true },
        select: { slug: true },
      });
      if (!targetPlan) {
        return { valid: false, message: 'Selected plan is not eligible for checkout' };
      }
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        expiresAt: coupon.expiresAt,
      },
    };
  }

  async createCoupon(data: { code: string; discountType: DiscountType; discountValue: number; expiresAt?: string; maxUses?: number }) {
    const code = this.normalizeCouponCode(data.code);
    if (!code) {
      throw new BadRequestException('Coupon code is required');
    }

    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    const stripe = this.getStripeClient();
    let stripeCouponId: string | null = null;
    let stripePromotionCodeId: string | null = null;

    if (stripe) {
      const coupon = await stripe.coupons.create({
        duration: 'once',
        ...(data.discountType === 'percentage'
          ? { percent_off: data.discountValue }
          : { amount_off: Math.round(data.discountValue * 100), currency: 'usd' }),
        name: code,
      });
      stripeCouponId = coupon.id;
      const promotionCode = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code,
        max_redemptions: data.maxUses || undefined,
        expires_at: data.expiresAt ? Math.floor(new Date(data.expiresAt).getTime() / 1000) : undefined,
      });
      stripePromotionCodeId = promotionCode.id;
    }

    return this.prisma.coupon.create({
      data: {
        code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        maxUses: data.maxUses,
        stripeCouponId,
        stripePromotionCodeId,
      },
    });
  }

  async updateCoupon(
    id: string,
    data: {
      code?: string;
      discountType?: DiscountType;
      discountValue?: number;
      expiresAt?: string;
      maxUses?: number;
      isActive?: boolean;
    },
  ) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const nextCode = data.code !== undefined ? this.normalizeCouponCode(data.code) : coupon.code;
    if (!nextCode) {
      throw new BadRequestException('Coupon code is required');
    }

    if (nextCode !== coupon.code) {
      const conflict = await this.prisma.coupon.findUnique({ where: { code: nextCode } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('Coupon code already exists');
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        code: nextCode,
        discountType: data.discountType ?? coupon.discountType,
        discountValue: data.discountValue ?? Number(coupon.discountValue),
        expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : undefined,
        maxUses: data.maxUses !== undefined ? data.maxUses : undefined,
        isActive: data.isActive ?? undefined,
      },
    });
  }

  async listCoupons() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { redemptions: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }

  async listPublicPromotions() {
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
      take: 12,
    });

    return coupons
      .filter((coupon) => !coupon.maxUses || coupon.usedCount < coupon.maxUses)
      .map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        expiresAt: coupon.expiresAt,
        remainingUses: coupon.maxUses ? Math.max(coupon.maxUses - coupon.usedCount, 0) : null,
      }));
  }

  async getAdminPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createPlan(data: any) {
    const slug = String(data.slug || '').trim().toLowerCase();
    if (!slug) {
      throw new BadRequestException('Plan slug is required');
    }

    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('A plan with this slug already exists');
    }

    return this.prisma.subscriptionPlan.create({
      data: this.toSubscriptionPlanInput(data, slug),
    });
  }

  async updatePlan(id: string, data: any) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const slug = String(data.slug || '').trim().toLowerCase();
    if (!slug) {
      throw new BadRequestException('Plan slug is required');
    }

    const conflict = await this.prisma.subscriptionPlan.findFirst({
      where: {
        slug,
        NOT: { id },
      },
    });
    if (conflict) {
      throw new ConflictException('Another plan already uses this slug');
    }

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: this.toSubscriptionPlanInput(data, slug),
    });
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const stripe = this.getStripeClient();
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!stripe || !secret) {
      if (this.isProduction()) {
        throw new ServiceUnavailableException('Stripe webhook is not configured for production');
      }
      return { received: true, mode: 'demo' };
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error: any) {
      this.logger.error(`Stripe webhook signature verification failed: ${error.message}`);
      stripeWebhookFailureCounter.inc();
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    const job = await this.queues.enqueueSubscriptionEvent({
      eventType: event.type,
      payload: event.data.object as Record<string, any>,
    });
    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: SUBSCRIPTION_EVENTS_QUEUE,
      jobName: SUBSCRIPTION_EVENT_JOB,
      metadataJson: { eventType: event.type } as Prisma.InputJsonValue,
    });

    return { received: true };
  }

  async handleNowPaymentsWebhook(payloadInput: Buffer | Record<string, any>, signature: string) {
    if (!this.nowPayments.isEnabled()) {
      if (this.isProduction()) {
        throw new ServiceUnavailableException('NOWPayments webhook is not configured for production');
      }
      return { received: true, mode: 'disabled' };
    }

    const rawBody = Buffer.isBuffer(payloadInput)
      ? payloadInput
      : Buffer.from(JSON.stringify(payloadInput));

    if (!this.nowPayments.verifyIpnSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid NOWPayments IPN signature');
    }

    const payload = Buffer.isBuffer(payloadInput)
      ? JSON.parse(payloadInput.toString('utf8'))
      : payloadInput;

    return this.processNowPaymentsWebhook(payload);
  }

  async processSubscriptionEvent(jobData: SubscriptionEventJobData) {
    const payload = jobData.payload;
    switch (jobData.eventType) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(payload);
        break;
      case 'invoice.paid':
        await this.onInvoicePaid(payload);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(payload);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(payload);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(payload);
        break;
      default:
        this.logger.log(`Unhandled Stripe event ${jobData.eventType}`);
    }
  }

  async runInvoiceSync(_: InvoiceSyncJobData) {
    const stripe = this.getStripeClient();
    if (!stripe) {
      return { synced: 0, mode: 'demo' };
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: { stripeCustomerId: { not: null } },
      distinct: ['stripeCustomerId'],
    });

    let synced = 0;
    for (const subscription of subscriptions) {
      if (!subscription.stripeCustomerId) continue;
      const invoices = await stripe.invoices.list({ customer: subscription.stripeCustomerId, limit: 20 });
      for (const invoice of invoices.data) {
        await this.upsertInvoice(subscription.userId, subscription.id, invoice);
        synced += 1;
      }
    }
    return { synced };
  }

  async runBillingSync(_: BillingSyncJobData) {
    const stripe = this.getStripeClient();
    if (!stripe) {
      return { synced: 0, mode: 'demo' };
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: { stripeSubscriptionId: { not: null } },
    });

    let synced = 0;
    for (const subscription of subscriptions) {
      if (!subscription.stripeSubscriptionId) continue;
      const remote = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      await this.onSubscriptionUpdated(remote as any);
      synced += 1;
    }
    return { synced };
  }

  async runUsageReset(_: UsageResetJobData) {
    const results = await this.usage.resetMonthlyUsageAndCredits();
    for (const item of results) {
      await this.notifications.create(item.userId, {
        type: 'subscription_renewed',
        title: 'Monthly credits renewed',
        body: `${item.creditsGranted} credits were added to your wallet for the new billing period.`,
        actionUrl: '/billing',
      });
    }
    return { processed: results.length };
  }

  async getAdminStats() {
    const [subscriptions, invoices, failedPayments, coupons, planDistribution, creditUsage, paymentTransactions] = await Promise.all([
      this.prisma.subscription.findMany({ include: { plan: true } }),
      this.prisma.billingInvoice.findMany({ where: { status: InvoiceStatus.paid } }),
      this.prisma.billingInvoice.count({ where: { status: InvoiceStatus.open } }),
      this.prisma.coupon.findMany(),
      this.prisma.subscription.groupBy({ by: ['planId'], _count: { _all: true } }),
      this.prisma.creditTransaction.groupBy({ by: ['type'], _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.paymentTransaction.findMany(),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = invoices.filter((invoice) => invoice.paidAt && invoice.paidAt >= startOfMonth);
    const mrr = subscriptions
      .filter((sub) => ['active', 'trialing', 'past_due'].includes(sub.status))
      .reduce((sum, sub) => sum + Number(sub.plan.priceMonthly), 0);
    const arr = mrr * 12;
    const revenue = invoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid || 0), 0);
    const nowPaymentsRevenue = paymentTransactions
      .filter((payment) => payment.provider === 'nowpayments' && payment.status === PaymentTransactionStatus.confirmed)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const nowPaymentsByStatus = paymentTransactions
      .filter((payment) => payment.provider === 'nowpayments')
      .reduce<Record<string, number>>((acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        return acc;
      }, {});

    return {
      revenue,
      totalRevenue: revenue + nowPaymentsRevenue,
      mrr,
      arr,
      activeSubscribers: subscriptions.filter((sub) => ['active', 'trialing', 'past_due'].includes(sub.status)).length,
      churnRate: subscriptions.length ? Number((subscriptions.filter((sub) => sub.status === 'canceled').length / subscriptions.length).toFixed(4)) : 0,
      failedPayments,
      couponUsage: coupons.map((coupon) => ({ code: coupon.code, usedCount: coupon.usedCount, maxUses: coupon.maxUses })),
      planDistribution,
      trialConversion: subscriptions.length ? Number((subscriptions.filter((sub) => sub.status === 'active').length / subscriptions.length).toFixed(4)) : 0,
      conversionRate: subscriptions.length ? Number((subscriptions.filter((sub) => sub.status === 'active').length / subscriptions.length).toFixed(4)) : 0,
      topPlans: planDistribution,
      creditConsumption: creditUsage,
      revenueThisMonth: paidThisMonth.reduce((sum, invoice) => sum + Number(invoice.amountPaid || 0), 0),
      nowPayments: {
        enabled: this.nowPayments.isEnabled(),
        revenue: nowPaymentsRevenue,
        transactions: paymentTransactions.filter((payment) => payment.provider === 'nowpayments').length,
        byStatus: nowPaymentsByStatus,
      },
    };
  }

  async getAdminSubscriptions(filters: any) {
    return this.prisma.subscription.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getRevenueSeries() {
    const [invoices, paymentTransactions] = await Promise.all([
      this.prisma.billingInvoice.findMany({
        where: { status: InvoiceStatus.paid, paidAt: { not: null } },
        orderBy: { paidAt: 'asc' },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { provider: 'nowpayments', status: PaymentTransactionStatus.confirmed },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const byMonth = new Map<string, number>();
    for (const invoice of invoices) {
      const month = invoice.paidAt!.toISOString().slice(0, 7);
      byMonth.set(month, (byMonth.get(month) || 0) + Number(invoice.amountPaid || 0));
    }
    for (const payment of paymentTransactions) {
      const month = payment.createdAt.toISOString().slice(0, 7);
      byMonth.set(month, (byMonth.get(month) || 0) + Number(payment.amount || 0));
    }
    return [...byMonth.entries()].map(([month, amount]) => ({ month, amount }));
  }

  private async onCheckoutCompleted(session: Record<string, any>) {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    if (!userId || !planId) return;

    const stripe = this.getStripeClient();
    if (stripe && session.subscription) {
      const remote = await stripe.subscriptions.retrieve(String(session.subscription));
      await this.onSubscriptionUpdated(remote as any);
    } else {
      await this.prisma.subscription.upsert({
        where: { stripeSubscriptionId: String(session.subscription || `local-${userId}-${planId}`) },
        update: {
          planId,
          stripeCustomerId: String(session.customer || ''),
          billingCycle: session.metadata?.billingCycle === 'yearly' ? BillingCycle.yearly : BillingCycle.monthly,
          status:
            session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
              ? SubscriptionStatus.active
              : SubscriptionStatus.incomplete,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.getPeriodEnd(
            session.metadata?.billingCycle === 'yearly' ? BillingCycle.yearly : BillingCycle.monthly,
          ),
          metadata: session.metadata as Prisma.InputJsonValue,
        },
        create: {
          userId,
          planId,
          stripeCustomerId: String(session.customer || ''),
          stripeSubscriptionId: session.subscription ? String(session.subscription) : null,
          billingCycle: session.metadata?.billingCycle === 'yearly' ? BillingCycle.yearly : BillingCycle.monthly,
          status:
            session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
              ? SubscriptionStatus.active
              : SubscriptionStatus.incomplete,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.getPeriodEnd(
            session.metadata?.billingCycle === 'yearly' ? BillingCycle.yearly : BillingCycle.monthly,
          ),
          metadata: session.metadata as Prisma.InputJsonValue,
        },
      });
    }

    if (session.metadata?.couponCode && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required')) {
      await this.redeemCouponAfterPayment(userId, session.metadata.couponCode, {
        stripeCheckoutSessionId: String(session.id || ''),
        stripeInvoiceId: session.invoice ? String(session.invoice) : null,
        subscriptionStripeId: session.subscription ? String(session.subscription) : null,
      });
    }

    await this.notifications.create(userId, {
      type: 'plan_upgraded',
      title: 'Subscription activated',
      body: 'Your subscription is active and billing has been set up successfully.',
      actionUrl: '/billing',
    });
    await this.audit.logUserAction({
      userId,
      action: 'billing.subscription_changed',
      entityType: 'subscription',
      metadata: { source: 'checkout_completed', stripeSubscriptionId: session.subscription },
    });
  }

  private async onInvoicePaid(invoice: Record<string, any>) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription || undefined },
      include: { plan: true },
    });
    if (!subscription) return;

    const invoiceRow = await this.upsertInvoice(subscription.userId, subscription.id, invoice);
    if (!['active', 'trialing'].includes(subscription.status)) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.active },
      });
    }

    const cycleKey = this.getResetKey(
      subscription.currentPeriodStart || new Date(invoice.created ? invoice.created * 1000 : Date.now()),
    );
    if (!invoiceRow.creditGrantAppliedAt && subscription.lastCreditResetKey !== cycleKey) {
      await this.credits.grant(
        subscription.userId,
        subscription.plan.creditsPerMonth,
        'subscription_grant',
        `${subscription.plan.name} credits`,
        {
          reason: 'invoice_paid',
          stripeInvoiceId: invoice.id,
          subscriptionId: subscription.id,
          cycleKey,
        },
      );
      await this.prisma.billingInvoice.update({
        where: { id: invoiceRow.id },
        data: { creditGrantAppliedAt: new Date() },
      });
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { lastCreditResetKey: cycleKey },
      });
    } else if (!invoiceRow.creditGrantAppliedAt) {
      await this.prisma.billingInvoice.update({
        where: { id: invoiceRow.id },
        data: { creditGrantAppliedAt: new Date() },
      });
    }

    const couponCode =
      invoice.discount?.coupon?.name ||
      invoice.lines?.data?.[0]?.metadata?.couponCode ||
      invoice.parent?.subscription_details?.metadata?.couponCode ||
      (
        subscription.metadata && typeof subscription.metadata === 'object'
          ? (subscription.metadata as Record<string, any>).couponCode
          : null
      );
    if (couponCode) {
      await this.redeemCouponAfterPayment(subscription.userId, String(couponCode), {
        stripeInvoiceId: String(invoice.id || ''),
        subscriptionStripeId: subscription.stripeSubscriptionId,
      });
    }

    await this.notifications.create(subscription.userId, {
      type: 'subscription_renewed',
      title: 'Subscription renewed',
      body: `Your ${subscription.plan.name} plan has been renewed successfully.`,
      actionUrl: '/billing',
    });
    await this.audit.logUserAction({
      userId: subscription.userId,
      action: 'billing.invoice_paid',
      entityType: 'invoice',
      entityId: String(invoice.id || ''),
      metadata: { subscriptionId: subscription.id, amountPaid: invoice.amount_paid },
    });
  }

  private async onInvoicePaymentFailed(invoice: Record<string, any>) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription || undefined },
    });
    if (!subscription) return;

    await this.upsertInvoice(subscription.userId, subscription.id, invoice, InvoiceStatus.open);
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.past_due },
    });

    await this.notifications.create(subscription.userId, {
      type: 'payment_failed',
      title: 'Payment failed',
      body: 'We could not process your latest subscription payment. Please update your billing method.',
      actionUrl: '/billing',
    });
  }

  private async onSubscriptionUpdated(remote: Record<string, any>) {
    const userId = remote.metadata?.userId || (await this.findUserIdByCustomer(remote.customer));
    const planId = remote.metadata?.planId || (await this.findPlanIdFromStripePrice(remote.items?.data?.[0]?.price?.id));
    if (!userId || !planId) return;

    const resolvedStatus = this.mapStripeSubscriptionStatus(remote.status);
    const billingCycle =
      remote.metadata?.billingCycle === 'yearly' ||
      remote.items?.data?.[0]?.price?.recurring?.interval === 'year'
        ? BillingCycle.yearly
        : BillingCycle.monthly;

    await this.prisma.subscription.upsert({
      where: { stripeSubscriptionId: remote.id },
      update: {
        planId,
        stripeCustomerId: remote.customer,
        status: resolvedStatus,
        billingCycle,
        currentPeriodStart: remote.current_period_start ? new Date(remote.current_period_start * 1000) : null,
        currentPeriodEnd: remote.current_period_end ? new Date(remote.current_period_end * 1000) : null,
        cancelAtPeriodEnd: Boolean(remote.cancel_at_period_end),
        canceledAt: remote.canceled_at ? new Date(remote.canceled_at * 1000) : null,
        endedAt: remote.ended_at ? new Date(remote.ended_at * 1000) : null,
        metadata: remote.metadata as Prisma.InputJsonValue,
      },
      create: {
        userId,
        planId,
        stripeSubscriptionId: remote.id,
        stripeCustomerId: remote.customer,
        billingCycle,
        status: resolvedStatus,
        currentPeriodStart: remote.current_period_start ? new Date(remote.current_period_start * 1000) : null,
        currentPeriodEnd: remote.current_period_end ? new Date(remote.current_period_end * 1000) : null,
        cancelAtPeriodEnd: Boolean(remote.cancel_at_period_end),
        metadata: remote.metadata as Prisma.InputJsonValue,
      },
    });
    await this.audit.logUserAction({
      userId: String(userId),
      action: 'billing.subscription_changed',
      entityType: 'subscription',
      metadata: {
        source: 'stripe_update',
        stripeSubscriptionId: remote.id,
        status: remote.status,
        cancelAtPeriodEnd: Boolean(remote.cancel_at_period_end),
      },
    });
  }

  private async onSubscriptionDeleted(remote: Record<string, any>) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: remote.id },
      data: {
        status: SubscriptionStatus.canceled,
        endedAt: new Date(),
      },
    });
    const userId = remote.metadata?.userId ? String(remote.metadata.userId) : null;
    if (userId) {
      await this.audit.logUserAction({
        userId,
        action: 'billing.subscription_changed',
        entityType: 'subscription',
        metadata: { source: 'stripe_deleted', stripeSubscriptionId: remote.id },
      });
    }
  }

  private async upsertInvoice(userId: string, subscriptionId: string | null, invoice: Record<string, any>, forceStatus?: InvoiceStatus) {
    return this.prisma.billingInvoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      update: {
        subscriptionId,
        stripeCustomerId: String(invoice.customer || ''),
        invoiceNumber: invoice.number || null,
        hostedInvoiceUrl: invoice.hosted_invoice_url || null,
        invoicePdfUrl: invoice.invoice_pdf || null,
        currency: String(invoice.currency || 'usd'),
        subtotalAmount: invoice.subtotal != null ? Number(invoice.subtotal) / 100 : null,
        totalAmount: invoice.total != null ? Number(invoice.total) / 100 : null,
        amountPaid: invoice.amount_paid != null ? Number(invoice.amount_paid) / 100 : null,
        status: forceStatus || this.mapInvoiceStatus(invoice.status),
        billedAt: invoice.created ? new Date(invoice.created * 1000) : null,
        paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
        creditGrantAppliedAt:
          forceStatus === InvoiceStatus.paid || this.mapInvoiceStatus(invoice.status) === InvoiceStatus.paid
            ? undefined
            : null,
        metadataJson: invoice as Prisma.InputJsonValue,
      },
      create: {
        userId,
        subscriptionId,
        stripeInvoiceId: invoice.id,
        stripeCustomerId: String(invoice.customer || ''),
        invoiceNumber: invoice.number || null,
        hostedInvoiceUrl: invoice.hosted_invoice_url || null,
        invoicePdfUrl: invoice.invoice_pdf || null,
        currency: String(invoice.currency || 'usd'),
        subtotalAmount: invoice.subtotal != null ? Number(invoice.subtotal) / 100 : null,
        totalAmount: invoice.total != null ? Number(invoice.total) / 100 : null,
        amountPaid: invoice.amount_paid != null ? Number(invoice.amount_paid) / 100 : null,
        status: forceStatus || this.mapInvoiceStatus(invoice.status),
        billedAt: invoice.created ? new Date(invoice.created * 1000) : null,
        paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
        metadataJson: invoice as Prisma.InputJsonValue,
      },
    });
  }

  private async resolveStripeDiscounts(code: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon?.stripePromotionCodeId) return undefined;
    return [{ promotion_code: coupon.stripePromotionCodeId }];
  }

  private findPlanIdFromStripePrice(priceId?: string) {
    if (!priceId) return Promise.resolve<string | null>(null);
    return this.prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          { stripePriceIdMonthly: priceId },
          { stripePriceIdYearly: priceId },
        ],
      },
      select: { id: true },
    }).then((plan) => plan?.id || null);
  }

  private async findUserIdByCustomer(customerId?: string) {
    if (!customerId) return null;
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    });
    return subscription?.userId || null;
  }

  private mapInvoiceStatus(status?: string): InvoiceStatus {
    switch (status) {
      case 'paid':
        return InvoiceStatus.paid;
      case 'void':
        return InvoiceStatus.void;
      case 'uncollectible':
        return InvoiceStatus.uncollectible;
      case 'draft':
        return InvoiceStatus.draft;
      default:
        return InvoiceStatus.open;
    }
  }

  private mapStripeSubscriptionStatus(status?: string): SubscriptionStatus {
    switch (status) {
      case 'trialing':
        return SubscriptionStatus.trialing;
      case 'active':
        return SubscriptionStatus.active;
      case 'past_due':
        return SubscriptionStatus.past_due;
      case 'canceled':
        return SubscriptionStatus.canceled;
      case 'incomplete':
        return SubscriptionStatus.incomplete;
      case 'incomplete_expired':
        return SubscriptionStatus.incomplete_expired;
      case 'unpaid':
        return SubscriptionStatus.unpaid;
      case 'paused':
        return SubscriptionStatus.paused;
      default:
        return SubscriptionStatus.incomplete;
    }
  }

  private async resolvePriceId(
    plan: { slug: string; stripePriceIdMonthly: string | null; stripePriceIdYearly: string | null },
    interval: BillingCycle,
  ) {
    const dbPriceId = await this.systemSettings.getString(`billing.stripe.price_ids.${plan.slug}.${interval}`);
    if (dbPriceId) {
      return dbPriceId;
    }

    const planKey = plan.slug.replace(/[^a-z0-9]/gi, '_').toUpperCase();
    const intervalKey = interval === BillingCycle.yearly ? 'YEARLY' : 'MONTHLY';
    const envPriceId =
      this.config.get<string>(`STRIPE_PRICE_ID_${planKey}_${intervalKey}`) ||
      this.config.get<string>(`STRIPE_PRICE_${planKey}_${intervalKey}`);

    if (envPriceId) {
      return envPriceId;
    }

    return interval === BillingCycle.yearly ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
  }

  private calculatePlanAmount(
    plan: Pick<SubscriptionPlan, 'priceMonthly' | 'priceYearly'>,
    interval: BillingCycle,
    coupon?: CouponApplyResult['coupon'],
  ) {
    const baseAmount = Number(interval === BillingCycle.yearly ? plan.priceYearly : plan.priceMonthly);
    if (!coupon) {
      return Number(baseAmount.toFixed(2));
    }

    const discounted =
      coupon.discountType === 'percentage'
        ? baseAmount - (baseAmount * coupon.discountValue) / 100
        : baseAmount - coupon.discountValue;

    return Number(Math.max(discounted, 0).toFixed(2));
  }

  private toSubscriptionPlanInput(data: any, slug: string) {
    return {
      name: String(data.name || '').trim(),
      slug,
      stripePriceIdMonthly: this.optionalString(data.stripePriceIdMonthly),
      stripePriceIdYearly: this.optionalString(data.stripePriceIdYearly),
      priceMonthly: Number(data.priceMonthly || 0),
      priceYearly: Number(data.priceYearly || 0),
      creditsPerMonth: Number(data.creditsPerMonth || 0),
      emailSendsPerDay: Number(data.emailSendsPerDay || 0),
      professorRevealsPerMonth: Number(data.professorRevealsPerMonth || 0),
      aiGenerationsPerMonth: Number(data.aiGenerationsPerMonth || 0),
      opportunityUnlocksPerMonth: Number(data.opportunityUnlocksPerMonth || 0),
      scholarshipUnlocksPerMonth: Number(data.scholarshipUnlocksPerMonth || 0),
      maxSavedProfessors: Number(data.maxSavedProfessors || 0),
      maxSavedScholarships: Number(data.maxSavedScholarships || 0),
      maxSmtpAccounts: Number(data.maxSmtpAccounts || 0),
      maxOauthAccounts: Number(data.maxOauthAccounts || 0),
      hasInboxSync: Boolean(data.hasInboxSync),
      hasAiMatchScore: Boolean(data.hasAiMatchScore),
      hasBulkEmail: Boolean(data.hasBulkEmail),
      hasAnalytics: Boolean(data.hasAnalytics),
      hasTeamAccess: Boolean(data.hasTeamAccess),
      isActive: data.isActive !== false,
      sortOrder: Number(data.sortOrder || 0),
    };
  }

  private optionalString(value: unknown) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || null;
  }

  private async processNowPaymentsWebhook(payload: Record<string, any>) {
    const providerInvoiceId = payload.invoice_id != null ? String(payload.invoice_id) : null;
    const providerPaymentId = payload.payment_id != null ? String(payload.payment_id) : null;
    const localTransactionId = payload.order_id != null ? String(payload.order_id) : null;

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          providerInvoiceId ? { providerInvoiceId } : undefined,
          providerPaymentId ? { providerPaymentId } : undefined,
          localTransactionId ? { id: localTransactionId } : undefined,
        ].filter(Boolean) as Prisma.PaymentTransactionWhereInput[],
      },
      include: { plan: true },
    });
    if (!transaction) {
      return { received: true, ignored: true };
    }

    const mappedStatus = this.nowPayments.mapTransactionStatus(payload.payment_status || payload.invoice_status);
    if (transaction.status === PaymentTransactionStatus.confirmed) {
      return { received: true, duplicate: true };
    }

    if (mappedStatus === 'confirmed') {
      const result = await this.confirmNowPaymentsTransaction(transaction.id, payload);
      if (result?.confirmed && result.couponCode) {
        await this.redeemCouponAfterPayment(result.userId, result.couponCode, {
          subscriptionId: result.subscriptionId,
        });
      }
      return { received: true, confirmed: Boolean(result?.confirmed) };
    }

    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: mappedStatus,
        providerInvoiceId: providerInvoiceId || transaction.providerInvoiceId,
        providerPaymentId: providerPaymentId || transaction.providerPaymentId,
        metadataJson: this.mergeJson(transaction.metadataJson, {
          ipnPayload: payload,
          paymentStatus: payload.payment_status || payload.invoice_status || null,
        }),
      },
    });

    return { received: true, status: mappedStatus };
  }

  private async confirmNowPaymentsTransaction(transactionId: string, payload: Record<string, any>) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.findUnique({
        where: { id: transactionId },
        include: { plan: true },
      });
      if (!transaction) {
        return { confirmed: false };
      }
      if (transaction.status === PaymentTransactionStatus.confirmed) {
        return { confirmed: false };
      }

      const metadata = (transaction.metadataJson && typeof transaction.metadataJson === 'object')
        ? transaction.metadataJson as Record<string, any>
        : {};
      const interval = metadata.billingCycle === BillingCycle.yearly ? BillingCycle.yearly : BillingCycle.monthly;
      const couponCode = typeof metadata.couponCode === 'string' ? metadata.couponCode : '';

      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PaymentTransactionStatus.confirmed,
          providerInvoiceId: payload.invoice_id != null ? String(payload.invoice_id) : transaction.providerInvoiceId,
          providerPaymentId: payload.payment_id != null ? String(payload.payment_id) : transaction.providerPaymentId,
          metadataJson: this.mergeJson(transaction.metadataJson, {
            confirmedAt: now.toISOString(),
            ipnPayload: payload,
            paymentStatus: payload.payment_status || payload.invoice_status || 'confirmed',
          }),
        },
      });

      const currentPeriodStart = now;
      const currentPeriodEnd = this.getPeriodEnd(interval, now);
      const existingSubscription = await tx.subscription.findFirst({
        where: { userId: transaction.userId },
        orderBy: { createdAt: 'desc' },
      });

      let subscriptionId: string;
      if (existingSubscription) {
        const updated = await tx.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            planId: transaction.planId,
            billingCycle: interval,
            status: SubscriptionStatus.active,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd: false,
            canceledAt: null,
            endedAt: null,
            metadata: this.mergeJson(existingSubscription.metadata, {
              provider: 'nowpayments',
              paymentTransactionId: transaction.id,
              providerInvoiceId: payload.invoice_id != null ? String(payload.invoice_id) : transaction.providerInvoiceId,
              billingCycle: interval,
              couponCode,
            }),
          },
        });
        subscriptionId = updated.id;
      } else {
        const created = await tx.subscription.create({
          data: {
            userId: transaction.userId,
            planId: transaction.planId,
            billingCycle: interval,
            status: SubscriptionStatus.active,
            currentPeriodStart,
            currentPeriodEnd,
            metadata: {
              provider: 'nowpayments',
              paymentTransactionId: transaction.id,
              providerInvoiceId: payload.invoice_id != null ? String(payload.invoice_id) : transaction.providerInvoiceId,
              billingCycle: interval,
              couponCode,
            } as Prisma.InputJsonValue,
          },
        });
        subscriptionId = created.id;
      }

      await tx.billingInvoice.create({
        data: {
          userId: transaction.userId,
          subscriptionId,
          invoiceNumber:
            transaction.providerInvoiceId ||
            (payload.invoice_id != null ? String(payload.invoice_id) : `NOW-${transaction.id}`),
          hostedInvoiceUrl: typeof metadata.invoiceUrl === 'string' ? metadata.invoiceUrl : null,
          currency: transaction.currency,
          subtotalAmount: transaction.amount,
          totalAmount: transaction.amount,
          amountPaid: transaction.amount,
          status: InvoiceStatus.paid,
          billedAt: now,
          paidAt: now,
          creditGrantAppliedAt: now,
          metadataJson: {
            provider: 'nowpayments',
            paymentTransactionId: transaction.id,
            ipnPayload: payload,
          } as Prisma.InputJsonValue,
        },
      });

      await this.credits.adjustWithTransaction(tx, transaction.userId, transaction.plan.creditsPerMonth, {
        type: 'subscription_grant',
        reason: 'nowpayments_confirmed',
        description: `${transaction.plan.name} credits`,
        metadataJson: {
          paymentTransactionId: transaction.id,
          provider: 'nowpayments',
          providerInvoiceId: payload.invoice_id != null ? String(payload.invoice_id) : transaction.providerInvoiceId,
        } as Prisma.InputJsonValue,
        allowNegative: false,
        createIfMissing: true,
      });

      await tx.subscription.update({
        where: { id: subscriptionId },
        data: { lastCreditResetKey: this.getResetKey(currentPeriodStart) },
      });

      return {
        confirmed: true,
        userId: transaction.userId,
        couponCode,
        subscriptionId,
      };
    });
  }

  private async redeemCouponAfterPayment(
    userId: string,
    code: string,
    options: {
      stripeInvoiceId?: string | null;
      stripeCheckoutSessionId?: string | null;
      subscriptionStripeId?: string | null;
      subscriptionId?: string | null;
    },
  ) {
    const normalizedCode = this.normalizeCouponCode(code);
    if (!normalizedCode) {
      return;
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: normalizedCode },
      select: { id: true, code: true, isActive: true, expiresAt: true, maxUses: true, usedCount: true },
    });
    if (!coupon || !coupon.isActive) {
      return;
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      return;
    }

    let subscriptionId: string | null = options.subscriptionId || null;
    if (!subscriptionId && options.subscriptionStripeId) {
      const subscription = await this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId: options.subscriptionStripeId },
        select: { id: true },
      });
      subscriptionId = subscription?.id || null;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.couponRedemption.findFirst({
          where: { couponId: coupon.id, userId },
          select: { id: true },
        });
        if (existing) {
          return;
        }

        const freshCoupon = await tx.coupon.findUnique({
          where: { id: coupon.id },
          select: { id: true, isActive: true, expiresAt: true, maxUses: true, usedCount: true },
        });
        if (!freshCoupon?.isActive) {
          return;
        }
        if (freshCoupon.expiresAt && freshCoupon.expiresAt.getTime() < Date.now()) {
          return;
        }
        if (freshCoupon.maxUses && freshCoupon.usedCount >= freshCoupon.maxUses) {
          return;
        }

        await tx.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId,
            code: normalizedCode,
            subscriptionId,
            stripeInvoiceId: options.stripeInvoiceId || null,
            stripeCheckoutSessionId: options.stripeCheckoutSessionId || null,
          },
        });

        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      });
    } catch (error: any) {
      if (error?.code !== 'P2002') {
        throw error;
      }
    }
  }

  private getResetKey(date: Date) {
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    return `${date.getUTCFullYear()}-${month}`;
  }

  private mergeJson(current: Prisma.JsonValue | null | undefined, extra: Record<string, unknown>) {
    const base =
      current && typeof current === 'object' && !Array.isArray(current)
        ? current as Record<string, unknown>
        : {};
    return { ...base, ...extra } as Prisma.InputJsonValue;
  }

  private isProduction() {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private isStripeEnabled() {
    return Boolean(
      this.config.get<string>('STRIPE_SECRET_KEY')
      && this.config.get<string>('STRIPE_WEBHOOK_SECRET'),
    );
  }

  private normalizeCouponCode(code: string | null | undefined) {
    return String(code || '').trim().toUpperCase();
  }

  private getStripeClient() {
    if (this.stripeClient) return this.stripeClient;
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) return null;
    this.stripeClient = new Stripe(key, { apiVersion: '2024-06-20' });
    return this.stripeClient;
  }

  private getPeriodEnd(cycle: BillingCycle, from = new Date()) {
    return cycle === BillingCycle.yearly
      ? new Date(from.getFullYear() + 1, from.getMonth(), from.getDate())
      : new Date(from.getFullYear(), from.getMonth() + 1, from.getDate());
  }
}
