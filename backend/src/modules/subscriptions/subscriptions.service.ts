import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  async getUserSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing', 'past_due'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCheckoutSession(userId: string, planSlug: string, interval: 'monthly' | 'yearly') {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
    if (!plan) throw new NotFoundException('Plan not found');

    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      // Demo mode: simulate subscription
      const existing = await this.prisma.subscription.findFirst({ where: { userId, status: 'active' } });
      if (existing) {
        return this.prisma.subscription.update({ where: { id: existing.id }, data: { planId: plan.id } });
      }
      return this.prisma.subscription.create({
        data: {
          userId, planId: plan.id, status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const stripe = require('stripe')(stripeKey);
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

    let customerId: string;
    const existing = await this.prisma.subscription.findFirst({ where: { userId } });
    if (existing?.stripeCustomerId) {
      customerId = existing.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({ email: user?.email, name: user?.fullName, metadata: { userId } });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.config.get('FRONTEND_URL')}/settings/subscription?success=true`,
      cancel_url: `${this.config.get('FRONTEND_URL')}/settings/subscription?canceled=true`,
      metadata: { userId, planSlug },
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  async cancelSubscription(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing'] } },
    });
    if (!sub) throw new NotFoundException('No active subscription');

    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey && sub.stripeSubscriptionId) {
      const stripe = require('stripe')(stripeKey);
      await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    }

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
    });
  }

  async getBillingPortalUrl(userId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { userId } });
    if (!sub?.stripeCustomerId) return { url: null };

    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) return { url: null };

    const stripe = require('stripe')(stripeKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${this.config.get('FRONTEND_URL')}/settings/subscription`,
    });
    return { url: session.url };
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!stripeKey || !webhookSecret) return { received: true };

    const stripe = require('stripe')(stripeKey);
    let event: any;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch { return { received: false }; }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const s = event.data.object;
        await this.prisma.subscription.upsert({
          where: { stripeSubscriptionId: s.id },
          update: {
            status: s.status,
            currentPeriodStart: new Date(s.current_period_start * 1000),
            currentPeriodEnd: new Date(s.current_period_end * 1000),
            cancelAtPeriodEnd: s.cancel_at_period_end,
          },
          create: {
            userId: s.metadata.userId,
            planId: s.metadata.planId || '',
            stripeSubscriptionId: s.id,
            stripeCustomerId: s.customer,
            status: s.status,
            currentPeriodStart: new Date(s.current_period_start * 1000),
            currentPeriodEnd: new Date(s.current_period_end * 1000),
          },
        });
        break;
      }
      case 'invoice.paid': {
        const inv = event.data.object;
        const sub = await this.prisma.subscription.findFirst({ where: { stripeSubscriptionId: inv.subscription } });
        if (sub) {
          const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: sub.planId } });
          if (plan) {
            await this.prisma.credits.updateMany({
              where: { userId: sub.userId },
              data: { balance: { increment: plan.creditsPerMonth }, lifetimeEarned: { increment: plan.creditsPerMonth } },
            });
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const s = event.data.object;
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: s.id },
          data: { status: 'canceled', endedAt: new Date() },
        });
        break;
      }
    }
    return { received: true };
  }
}
