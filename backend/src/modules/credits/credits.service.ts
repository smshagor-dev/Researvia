import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { creditUsageCounter } from '../observability/metrics.registry';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const credits = await this.prisma.credits.findUnique({ where: { userId } });
    if (!credits) return { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
    return credits;
  }

  async deduct(
    userId: string,
    amount: number,
    type: any,
    referenceId?: string,
    referenceType?: string,
    description?: string,
    metadataJson?: Prisma.InputJsonValue,
  ) {
    const result = await this.changeBalance(userId, -Math.abs(amount), {
      type,
      referenceId,
      referenceType,
      reason: description || 'credit_deduction',
      description,
      metadataJson,
      allowNegative: false,
      createIfMissing: false,
    });
    creditUsageCounter.inc({ type: String(type) }, amount);
    return { balance: result.balance };
  }

  async grant(userId: string, amount: number, type: any, description?: string, metadataJson?: Prisma.InputJsonValue) {
    const result = await this.changeBalance(userId, Math.abs(amount), {
      type,
      reason: description || 'credit_grant',
      description,
      metadataJson,
      allowNegative: false,
      createIfMissing: true,
    });
    creditUsageCounter.inc({ type: String(type) }, amount);
    return { balance: result.balance };
  }

  async adjust(
    userId: string,
    amount: number,
    options: {
      type: any;
      reason: string;
      description?: string;
      referenceId?: string;
      referenceType?: string;
      metadataJson?: Prisma.InputJsonValue;
      allowNegative?: boolean;
      createIfMissing?: boolean;
    },
  ) {
    return this.changeBalance(userId, amount, options);
  }

  async adjustWithTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    options: {
      type: any;
      reason: string;
      description?: string;
      referenceId?: string;
      referenceType?: string;
      metadataJson?: Prisma.InputJsonValue;
      allowNegative?: boolean;
      createIfMissing?: boolean;
    },
  ) {
    return this.changeBalance(userId, amount, options, tx);
  }

  async getTransactions(userId: string, page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [transactions, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip, take: perPage,
      }),
      this.prisma.creditTransaction.count({ where: { userId } }),
    ]);
    return { data: transactions, meta: { page, perPage, total } };
  }

  async checkSufficientCredits(userId: string, required: number): Promise<boolean> {
    const credits = await this.prisma.credits.findUnique({ where: { userId } });
    return (credits?.balance || 0) >= required;
  }

  private async changeBalance(
    userId: string,
    amount: number,
    options: {
      type: any;
      reason: string;
      description?: string;
      referenceId?: string;
      referenceType?: string;
      metadataJson?: Prisma.InputJsonValue;
      allowNegative?: boolean;
      createIfMissing?: boolean;
    },
    txClient?: Prisma.TransactionClient,
  ) {
    const run = async (tx: Prisma.TransactionClient) => {
      const existing = await tx.credits.findUnique({ where: { userId } });
      if (!existing && !options.createIfMissing) {
        throw new NotFoundException('Credits not found');
      }

      const credits = existing || await tx.credits.create({
        data: { userId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
      });

      const nextBalance = credits.balance + amount;
      if (!options.allowNegative && nextBalance < 0) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_CREDITS',
          message: `Insufficient credits. Need ${Math.abs(amount)}, have ${credits.balance}`,
        });
      }

      const updated = await tx.credits.update({
        where: { userId },
        data: {
          balance: nextBalance,
          lifetimeEarned: amount > 0 ? { increment: amount } : undefined,
          lifetimeSpent: amount < 0 ? { increment: Math.abs(amount) } : undefined,
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          walletId: updated.id,
          amount,
          type: options.type,
          referenceId: options.referenceId,
          referenceType: options.referenceType,
          reason: options.reason,
          description: options.description,
          metadataJson: options.metadataJson,
          balanceAfter: updated.balance,
        },
      });

      return updated;
    };

    if (txClient) {
      return run(txClient);
    }

    return this.prisma.$transaction(run);
  }
}
