import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        profile: true,
        credits: true,
        subscriptions: {
          where: { status: { in: ['active', 'trialing', 'past_due'] } },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { favorites: true, savedScholarships: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...safe } = user as any;
    return {
      ...safe,
      activeSubscription: user.subscriptions[0] || null,
      stats: { savedProfessors: user._count.favorites, savedScholarships: user._count.savedScholarships },
    };
  }

  async updateMe(userId: string, data: { fullName?: string; avatarUrl?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, updatedAt: true },
    });
    return user;
  }

  async updateProfile(userId: string, data: any) {
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return profile;
  }

  async getProfile(userId: string) {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const key = `avatars/${userId}/${Date.now()}-${file.originalname}`;
    const url = await this.storage.upload(key, file.buffer, file.mimetype);
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } });
    return { avatarUrl: url };
  }

  async uploadFile(userId: string, type: 'cv' | 'sop', file: Express.Multer.File) {
    const key = `documents/${userId}/${type}/${Date.now()}-${file.originalname}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    const field = type === 'cv' ? 'cvFileKey' : 'sopFileKey';
    await this.prisma.userProfile.upsert({
      where: { userId },
      update: { [field]: key },
      create: { userId, [field]: key },
    });
    const signedUrl = await this.storage.getSignedUrl(key);
    return { fileKey: key, url: signedUrl };
  }

  async getNotifications(userId: string, page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip, take: perPage,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data: notifications, meta: { page, perPage, total } };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async getUnreadNotificationCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async getSessions(userId: string) {
    // In real impl: read from Redis refresh:userId:* keys
    return { sessions: [] };
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
        email: `deleted_${userId}@deleted.local`,
      },
    });
    return { success: true };
  }

  // Admin methods
  async findAll(filters: any, page: number, perPage: number) {
    const where: any = {};
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search } },
        { fullName: { contains: filters.search } },
      ];
    }
    if (filters.role) where.role = filters.role;
    if (filters.status) where.status = filters.status;
    where.deletedAt = null;

    const skip = (page - 1) * perPage;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip, take: perPage,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, fullName: true, role: true, status: true,
          avatarUrl: true, lastLoginAt: true, createdAt: true,
          credits: { select: { balance: true } },
          subscriptions: {
            where: { status: 'active' },
            include: { plan: { select: { name: true, slug: true } } },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: users, meta: { page, perPage, total, lastPage: Math.ceil(total / perPage) } };
  }

  async adminUpdateUser(userId: string, data: { role?: string; status?: string }) {
    return this.prisma.user.update({ where: { id: userId }, data: data as any });
  }

  async adjustCredits(userId: string, amount: number, description: string) {
    const credits = await this.prisma.credits.findUnique({ where: { userId } });
    if (!credits) throw new NotFoundException('Credits record not found');

    const newBalance = credits.balance + amount;
    await this.prisma.$transaction([
      this.prisma.credits.update({
        where: { userId },
        data: {
          balance: newBalance,
          lifetimeEarned: amount > 0 ? { increment: amount } : undefined,
          lifetimeSpent: amount < 0 ? { increment: Math.abs(amount) } : undefined,
        },
      }),
      this.prisma.creditTransaction.create({
        data: {
          userId,
          amount,
          type: 'admin_adjustment',
          description,
          balanceAfter: newBalance,
        },
      }),
    ]);
    return { balance: newBalance };
  }
}
