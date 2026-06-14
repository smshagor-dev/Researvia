import { BadRequestException, Injectable } from '@nestjs/common';
import { BillingCycle, Prisma, UsageMetricType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UsageCheckResult, UsageResetResult } from './billing.types';

@Injectable()
export class UsageMeteringService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsageSummary(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing', 'past_due'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    const plan = subscription?.plan || await this.prisma.subscriptionPlan.findUnique({ where: { slug: 'free' } });

    const metricTypes: UsageMetricType[] = [
      'professor_reveal',
      'ai_generation',
      'email_send',
      'scholarship_unlock',
      'opportunity_unlock',
    ];

    const usage = await Promise.all(metricTypes.map((metricType) => this.getUsageStatus(userId, metricType, plan || undefined)));
    return {
      plan,
      metrics: usage,
    };
  }

  async assertWithinLimit(userId: string, metricType: UsageMetricType) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing', 'past_due'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    const plan = subscription?.plan || await this.prisma.subscriptionPlan.findUnique({ where: { slug: 'free' } });
    const status = await this.getUsageStatus(userId, metricType, plan || undefined);

    if (status.limit !== null && status.currentCount >= status.limit) {
      throw new BadRequestException({
        code: 'USAGE_LIMIT_REACHED',
        message: `Usage limit reached for ${metricType}.`,
        details: status,
      });
    }

    return status;
  }

  async recordUsage(userId: string, metricType: UsageMetricType, incrementBy = 1) {
    const { periodStart, periodEnd } = this.getPeriod(metricType);
    return this.prisma.usageMetric.upsert({
      where: {
        userId_metricType_periodStart_periodEnd: {
          userId,
          metricType,
          periodStart,
          periodEnd,
        },
      },
      update: {
        count: { increment: incrementBy },
      },
      create: {
        userId,
        metricType,
        count: incrementBy,
        periodStart,
        periodEnd,
      },
    });
  }

  async resetMonthlyUsageAndCredits() {
    const results: UsageResetResult[] = [];
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: { status: { in: ['active', 'trialing', 'past_due'] } },
      include: { plan: true },
    });
    for (const subscription of activeSubscriptions) {
      const credits = await this.prisma.credits.upsert({
        where: { userId: subscription.userId },
        update: {
          balance: { increment: subscription.plan.creditsPerMonth },
          lifetimeEarned: { increment: subscription.plan.creditsPerMonth },
        },
        create: {
          userId: subscription.userId,
          balance: subscription.plan.creditsPerMonth,
          lifetimeEarned: subscription.plan.creditsPerMonth,
        },
      });

      await this.prisma.creditTransaction.create({
        data: {
          userId: subscription.userId,
          walletId: credits.id,
          amount: subscription.plan.creditsPerMonth,
          type: 'subscription_grant',
          reason: 'monthly_reset',
          description: `${subscription.plan.name} monthly credit refresh`,
          balanceAfter: credits.balance,
          metadataJson: {
            subscriptionId: subscription.id,
            planId: subscription.planId,
          } as Prisma.InputJsonValue,
        },
      });

      results.push({ userId: subscription.userId, creditsGranted: subscription.plan.creditsPerMonth });
    }

    return results;
  }

  async getUsageStatus(userId: string, metricType: UsageMetricType, plan?: any): Promise<UsageCheckResult> {
    const resolvedPlan = plan || await this.prisma.subscriptionPlan.findUnique({ where: { slug: 'free' } });
    const { periodStart, periodEnd } = this.getPeriod(metricType);

    const metric = await this.prisma.usageMetric.findUnique({
      where: {
        userId_metricType_periodStart_periodEnd: {
          userId,
          metricType,
          periodStart,
          periodEnd,
        },
      },
    });

    const currentCount = metric?.count || 0;
    const limit = this.resolveLimit(resolvedPlan, metricType);
    return {
      metricType,
      currentCount,
      limit,
      remaining: limit === null ? null : Math.max(limit - currentCount, 0),
      periodStart,
      periodEnd,
    };
  }

  private resolveLimit(plan: any, metricType: UsageMetricType) {
    if (!plan) return 0;
    switch (metricType) {
      case 'professor_reveal':
        return plan.professorRevealsPerMonth >= 9999 ? null : plan.professorRevealsPerMonth;
      case 'ai_generation':
        return plan.aiGenerationsPerMonth >= 9999 ? null : plan.aiGenerationsPerMonth;
      case 'email_send':
        return plan.emailSendsPerDay >= 9999 ? null : plan.emailSendsPerDay;
      case 'scholarship_unlock':
        return plan.scholarshipUnlocksPerMonth >= 9999 ? null : plan.scholarshipUnlocksPerMonth;
      case 'opportunity_unlock':
        return plan.opportunityUnlocksPerMonth >= 9999 ? null : plan.opportunityUnlocksPerMonth;
      default:
        return 0;
    }
  }

  private getPeriod(metricType: UsageMetricType) {
    const now = new Date();
    if (metricType === 'email_send') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { periodStart: start, periodEnd: end };
    }

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { periodStart: start, periodEnd: end };
  }
}
