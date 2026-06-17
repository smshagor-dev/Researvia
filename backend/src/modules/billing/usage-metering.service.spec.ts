import { BillingCycle, SubscriptionStatus } from '@prisma/client';
import { UsageMeteringService } from './usage-metering.service';

function currentResetKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

describe('UsageMeteringService', () => {
  it('grants monthly credits once per reset key', async () => {
    const prisma = {
      subscription: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sub-1',
            userId: 'user-1',
            planId: 'plan-1',
            status: SubscriptionStatus.active,
            billingCycle: BillingCycle.monthly,
            currentPeriodStart: new Date('2026-06-01T00:00:00Z'),
            currentPeriodEnd: new Date('2026-07-01T00:00:00Z'),
            lastCreditResetKey: null,
            createdAt: new Date('2026-06-01T00:00:00Z'),
            plan: { name: 'Pro', creditsPerMonth: 100 },
          },
        ]),
        update: jest.fn().mockResolvedValue(undefined),
      },
      subscriptionPlan: { findUnique: jest.fn() },
      usageMetric: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    const credits = { grant: jest.fn().mockResolvedValue(undefined) };
    const service = new UsageMeteringService(prisma as any, credits as any);

    await expect(service.resetMonthlyUsageAndCredits()).resolves.toEqual([
      { userId: 'user-1', creditsGranted: 100 },
    ]);

    expect(credits.grant).toHaveBeenCalledTimes(1);
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { lastCreditResetKey: currentResetKey() },
    });
  });

  it('skips users already reset for the current month', async () => {
    const prisma = {
      subscription: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sub-1',
            userId: 'user-1',
            status: SubscriptionStatus.active,
            lastCreditResetKey: currentResetKey(),
            createdAt: new Date('2026-06-01T00:00:00Z'),
            plan: { name: 'Pro', creditsPerMonth: 100 },
          },
        ]),
      },
    };
    const credits = { grant: jest.fn() };
    const service = new UsageMeteringService(prisma as any, credits as any);

    await expect(service.resetMonthlyUsageAndCredits()).resolves.toEqual([]);
    expect(credits.grant).not.toHaveBeenCalled();
  });
});
