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
    const credits = await this.prisma.credits.findUnique({ where: { userId } });
    if (!credits) throw new NotFoundException('Credits not found');
    if (credits.balance < amount) {
      throw new BadRequestException({ code: 'INSUFFICIENT_CREDITS', message: `Insufficient credits. Need ${amount}, have ${credits.balance}` });
    }

    const newBalance = credits.balance - amount;
    await this.prisma.$transaction([
      this.prisma.credits.update({
        where: { userId },
        data: { balance: newBalance, lifetimeSpent: { increment: amount } },
      }),
      this.prisma.creditTransaction.create({
        data: {
          userId,
          walletId: credits.id,
          amount: -amount,
          type,
          referenceId,
          referenceType,
          reason: description,
          description,
          metadataJson,
          balanceAfter: newBalance,
        },
      }),
    ]);
    creditUsageCounter.inc({ type: String(type) }, amount);
    return { balance: newBalance };
  }

  async grant(userId: string, amount: number, type: any, description?: string, metadataJson?: Prisma.InputJsonValue) {
    const credits = await this.prisma.credits.upsert({
      where: { userId },
      update: { balance: { increment: amount }, lifetimeEarned: { increment: amount } },
      create: { userId, balance: amount, lifetimeEarned: amount },
    });

    await this.prisma.creditTransaction.create({
      data: {
        userId,
        walletId: credits.id,
        amount,
        type,
        reason: description,
        description,
        metadataJson,
        balanceAfter: credits.balance,
      },
    });
    creditUsageCounter.inc({ type: String(type) }, amount);
    return { balance: credits.balance };
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
}
