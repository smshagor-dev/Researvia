import { DiscountType, SubscriptionStatus } from '@prisma/client';
import { BillingService } from './billing.service';

function createService() {
  const prisma = {
    subscription: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    billingInvoice: {
      upsert: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    couponRedemption: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    subscriptionPlan: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return values[key];
    }),
  };

  const usage = { resetMonthlyUsageAndCredits: jest.fn() };
  const notifications = { create: jest.fn() };
  const queues = { enqueueSubscriptionEvent: jest.fn() };
  const syncLogs = { createQueuedLog: jest.fn() };
  const credits = { grant: jest.fn(), adjustWithTransaction: jest.fn() };
  const audit = { logUserAction: jest.fn() };
  const nowPayments = {
    isEnabled: jest.fn(),
    verifyIpnSignature: jest.fn(),
    mapTransactionStatus: jest.fn(),
    getPaymentMethodConfig: jest.fn(),
  };
  const systemSettings = {
    getString: jest.fn(),
  };

  const service = new BillingService(
    prisma as any,
    config as any,
    usage as any,
    notifications as any,
    queues as any,
    syncLogs as any,
    credits as any,
    audit as any,
    nowPayments as any,
    systemSettings as any,
  );

  return { service, prisma, config, usage, notifications, queues, syncLogs, credits, audit, nowPayments, systemSettings };
}

describe('BillingService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('queues verified Stripe webhook events', async () => {
    const { service, queues, syncLogs } = createService();
    (service as any).stripeClient = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: { object: { id: 'cs_123', customer: 'cus_123' } },
        }),
      },
    };
    queues.enqueueSubscriptionEvent.mockResolvedValue({ id: 'job-1' });
    syncLogs.createQueuedLog.mockResolvedValue(undefined);

    await expect(service.handleStripeWebhook(Buffer.from('{}'), 'sig_123')).resolves.toEqual({ received: true });

    expect(queues.enqueueSubscriptionEvent).toHaveBeenCalledWith({
      eventType: 'checkout.session.completed',
      payload: { id: 'cs_123', customer: 'cus_123' },
    });
    expect(syncLogs.createQueuedLog).toHaveBeenCalled();
  });

  it('marks subscriptions past due on Stripe payment failure', async () => {
    const { service, prisma, notifications } = createService();
    prisma.subscription.findFirst.mockResolvedValue({
      id: 'sub-db-1',
      userId: 'user-1',
      stripeSubscriptionId: 'sub_1',
      status: SubscriptionStatus.active,
    });
    prisma.billingInvoice.upsert.mockResolvedValue({ id: 'invoice-row-1' });
    prisma.subscription.update.mockResolvedValue(undefined);
    notifications.create.mockResolvedValue(undefined);

    await service.processSubscriptionEvent({
      eventType: 'invoice.payment_failed',
      payload: { id: 'in_1', subscription: 'sub_1', customer: 'cus_1', status: 'open' },
    });

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-db-1' },
      data: { status: SubscriptionStatus.past_due },
    });
    expect(notifications.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ type: 'payment_failed', actionUrl: '/billing' }),
    );
  });

  it('validates coupons for eligible plans', async () => {
    const { service, prisma } = createService();
    prisma.coupon.findUnique.mockResolvedValue({
      id: 'coupon-1',
      code: 'SAVE10',
      isActive: true,
      expiresAt: new Date(Date.now() + 60_000),
      maxUses: 10,
      usedCount: 1,
      discountType: DiscountType.percentage,
      discountValue: 10,
    });
    prisma.couponRedemption.findFirst.mockResolvedValue(null);
    prisma.subscriptionPlan.findFirst.mockResolvedValue({ slug: 'pro' });

    await expect(service.applyCoupon('user-1', 'SAVE10', { planSlug: 'pro' })).resolves.toEqual(
      expect.objectContaining({
        valid: true,
        coupon: expect.objectContaining({ code: 'SAVE10', discountValue: 10 }),
      }),
    );
  });

  it('redeems a coupon only once after payment confirmation', async () => {
    const { service, prisma } = createService();
    prisma.coupon.findUnique.mockResolvedValue({
      id: 'coupon-1',
      code: 'SAVE10',
      isActive: true,
      expiresAt: new Date(Date.now() + 60_000),
      maxUses: 5,
      usedCount: 0,
    });

    const tx = {
      couponRedemption: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'redeemed' }),
        create: jest.fn().mockResolvedValue(undefined),
      },
      coupon: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'coupon-1',
          isActive: true,
          expiresAt: new Date(Date.now() + 60_000),
          maxUses: 5,
          usedCount: 0,
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      subscription: {
        findFirst: jest.fn().mockResolvedValue({ id: 'sub-db-1' }),
      },
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    await (service as any).redeemCouponAfterPayment('user-1', 'SAVE10', {
      subscriptionId: 'sub-db-1',
      stripeInvoiceId: 'in_1',
    });
    await (service as any).redeemCouponAfterPayment('user-1', 'SAVE10', {
      subscriptionId: 'sub-db-1',
      stripeInvoiceId: 'in_1',
    });

    expect(tx.couponRedemption.create).toHaveBeenCalledTimes(1);
    expect(tx.coupon.update).toHaveBeenCalledTimes(1);
  });

  it('accepts confirmed NOWPayments IPN notifications', async () => {
    const { service, nowPayments } = createService();
    nowPayments.isEnabled.mockReturnValue(true);
    nowPayments.verifyIpnSignature.mockReturnValue(true);
    jest.spyOn(service as any, 'processNowPaymentsWebhook').mockResolvedValue({ received: true, confirmed: true });

    await expect(
      service.handleNowPaymentsWebhook({ order_id: 'txn-1', payment_status: 'finished' }, 'sig_np'),
    ).resolves.toEqual({ received: true, confirmed: true });

    expect(nowPayments.verifyIpnSignature).toHaveBeenCalled();
  });
});
