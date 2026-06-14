import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  DiscountType,
  InvoiceStatus,
  Prisma,
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
  ) {}

  async getBillingOverview(userId: string) {
    const [subscription, credits, invoices, usage, team] = await Promise.all([
      this.getUserSubscription(userId),
      this.credits.getBalance(userId),
      this.getInvoices(userId),
      this.usage.getUsageSummary(userId),
      this.prisma.team.findFirst({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        include: { members: { include: { user: { select: { id: true, fullName: true, email: true } } } }, plan: true },
      }),
    ]);

    return {
      subscription,
      credits,
      usage,
      invoices,
      team,
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
      this.prisma.subscriptionPlan.findUnique({ where: { slug: request.planSlug } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
      request.couponCode ? this.applyCoupon(userId, request.couponCode, false) : Promise.resolve({ valid: false } as CouponApplyResult),
    ]);

    if (!plan) throw new NotFoundException('Plan not found');
    if (!user) throw new NotFoundException('User not found');

    const stripe = this.getStripeClient();
    if (!stripe) {
      const current = await this.getUserSubscription(userId);
      if (current) {
        await this.prisma.subscription.update({
          where: { id: current.id },
          data: {
            planId: plan.id,
            billingCycle: interval,
            status: SubscriptionStatus.active,
            currentPeriodStart: new Date(),
            currentPeriodEnd: this.getPeriodEnd(interval),
          },
        });
      } else {
        await this.prisma.subscription.create({
          data: {
            userId,
            planId: plan.id,
            billingCycle: interval,
            status: SubscriptionStatus.active,
            currentPeriodStart: new Date(),
            currentPeriodEnd: this.getPeriodEnd(interval),
          },
        });
      }
      await this.audit.logUserAction({
        userId,
        action: 'billing.subscription_changed',
        entityType: 'subscription',
        metadata: { planSlug: plan.slug, billingCycle: interval, mode: 'demo' },
      });
      return { checkoutUrl: `${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/billing?success=true` };
    }

    const priceId = interval === BillingCycle.yearly ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
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
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
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

  async applyCoupon(userId: string, code: string, persist = true): Promise<CouponApplyResult> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      return { valid: false, message: 'Coupon not found or inactive' };
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      return { valid: false, message: 'Coupon expired' };
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, message: 'Coupon usage limit reached' };
    }

    if (persist) {
      await this.prisma.$transaction([
        this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        }),
        this.prisma.couponRedemption.create({
          data: { couponId: coupon.id, userId, code: coupon.code },
        }),
      ]);
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
    const stripe = this.getStripeClient();
    let stripeCouponId: string | null = null;
    let stripePromotionCodeId: string | null = null;

    if (stripe) {
      const coupon = await stripe.coupons.create({
        duration: 'once',
        ...(data.discountType === 'percentage'
          ? { percent_off: data.discountValue }
          : { amount_off: Math.round(data.discountValue * 100), currency: 'usd' }),
        name: data.code,
      });
      stripeCouponId = coupon.id;
      const promotionCode = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code: data.code,
        max_redemptions: data.maxUses || undefined,
        expires_at: data.expiresAt ? Math.floor(new Date(data.expiresAt).getTime() / 1000) : undefined,
      });
      stripePromotionCodeId = promotionCode.id;
    }

    return this.prisma.coupon.create({
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        maxUses: data.maxUses,
        stripeCouponId,
        stripePromotionCodeId,
      },
    });
  }

  async listCoupons() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { redemptions: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const stripe = this.getStripeClient();
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!stripe || !secret) {
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
    const [subscriptions, invoices, failedPayments, coupons, planDistribution, creditUsage] = await Promise.all([
      this.prisma.subscription.findMany({ include: { plan: true } }),
      this.prisma.billingInvoice.findMany({ where: { status: InvoiceStatus.paid } }),
      this.prisma.billingInvoice.count({ where: { status: InvoiceStatus.open } }),
      this.prisma.coupon.findMany(),
      this.prisma.subscription.groupBy({ by: ['planId'], _count: { _all: true } }),
      this.prisma.creditTransaction.groupBy({ by: ['type'], _sum: { amount: true }, _count: { _all: true } }),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = invoices.filter((invoice) => invoice.paidAt && invoice.paidAt >= startOfMonth);
    const mrr = subscriptions
      .filter((sub) => ['active', 'trialing', 'past_due'].includes(sub.status))
      .reduce((sum, sub) => sum + Number(sub.plan.priceMonthly), 0);
    const arr = mrr * 12;
    const revenue = invoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid || 0), 0);

    return {
      revenue,
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
    const invoices = await this.prisma.billingInvoice.findMany({
      where: { status: InvoiceStatus.paid, paidAt: { not: null } },
      orderBy: { paidAt: 'asc' },
    });

    const byMonth = new Map<string, number>();
    for (const invoice of invoices) {
      const month = invoice.paidAt!.toISOString().slice(0, 7);
      byMonth.set(month, (byMonth.get(month) || 0) + Number(invoice.amountPaid || 0));
    }
    return [...byMonth.entries()].map(([month, amount]) => ({ month, amount }));
  }

  private async onCheckoutCompleted(session: Record<string, any>) {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    if (!userId || !planId) return;

    const existing = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: session.subscription || undefined },
    });

    if (existing) return existing;

    await this.prisma.subscription.create({
      data: {
        userId,
        planId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        billingCycle: session.metadata?.billingCycle === 'yearly' ? BillingCycle.yearly : BillingCycle.monthly,
        status: SubscriptionStatus.active,
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.getPeriodEnd(session.metadata?.billingCycle === 'yearly' ? BillingCycle.yearly : BillingCycle.monthly),
        metadata: session.metadata as Prisma.InputJsonValue,
      },
    });

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

    await this.upsertInvoice(subscription.userId, subscription.id, invoice);
    await this.credits.grant(
      subscription.userId,
      subscription.plan.creditsPerMonth,
      'subscription_grant',
      `${subscription.plan.name} credits`,
      {
        reason: 'invoice_paid',
        stripeInvoiceId: invoice.id,
      },
    );

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

    await this.prisma.subscription.upsert({
      where: { stripeSubscriptionId: remote.id },
      update: {
        planId,
        stripeCustomerId: remote.customer,
        status: remote.status,
        billingCycle: remote.metadata?.billingCycle === 'yearly' ? BillingCycle.yearly : BillingCycle.monthly,
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
        billingCycle: remote.metadata?.billingCycle === 'yearly' ? BillingCycle.yearly : BillingCycle.monthly,
        status: remote.status,
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
      metadata: { source: 'stripe_update', stripeSubscriptionId: remote.id, status: remote.status },
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

  private getStripeClient() {
    if (this.stripeClient) return this.stripeClient;
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) return null;
    this.stripeClient = new Stripe(key, { apiVersion: '2024-06-20' });
    return this.stripeClient;
  }

  private getPeriodEnd(cycle: BillingCycle) {
    const now = new Date();
    return cycle === BillingCycle.yearly
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
}
