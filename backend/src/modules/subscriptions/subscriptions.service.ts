import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly billing: BillingService,
  ) {}

  async getPlans() {
    return this.billing.getPlans();
  }

  async getUserSubscription(userId: string) {
    return this.billing.getUserSubscription(userId);
  }

  async createCheckoutSession(userId: string, planSlug: string, interval: 'monthly' | 'yearly') {
    return this.billing.createCheckoutSession(userId, { planSlug, interval });
  }

  async cancelSubscription(userId: string) {
    return this.billing.cancelSubscription(userId);
  }

  async getBillingPortalUrl(userId: string) {
    return this.billing.createBillingPortal(userId);
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    return this.billing.handleStripeWebhook(payload, signature);
  }
}
