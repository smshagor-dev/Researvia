import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EmailAccountsService } from '../email-accounts/email-accounts.service';
import { StudentProfileService } from '../student-profile/student-profile.service';
import { SecurityService } from '../security/security.service';
import { AuditLogService } from '../security/audit-log.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly emailAccounts: EmailAccountsService,
    private readonly studentProfiles: StudentProfileService,
    private readonly security: SecurityService,
    private readonly audit: AuditLogService,
  ) {}

  async findMe(userId: string) {
    await this.ensureStudentAccessBootstrap(userId);
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        profile: true,
        studentProfile: {
          select: {
            id: true,
            profileCompleteness: true,
            onboardingCompleted: true,
          },
        },
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

    const studentMeta = await this.studentProfiles.getStudentSessionMeta(userId);
    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...safe } = user as any;
    return {
      ...safe,
      ...studentMeta,
      activeSubscription: user.subscriptions[0] || null,
      stats: { savedProfessors: user._count.favorites, savedScholarships: user._count.savedScholarships },
    };
  }

  async ensureStudentAccessBootstrap(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const normalizedRole = String(user.role || '').toLowerCase();
    if (!['user', 'student'].includes(normalizedRole)) {
      return user;
    }

    try {
      await this.emailAccounts.provisionSystemMailboxForUser(user);
    } catch {
      // Keep user access available even if mailbox provisioning is temporarily unavailable.
    }
    await this.studentProfiles.ensureStudentProfileForUser(user);
    return user;
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
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }
    const key = `avatars/${userId}/${Date.now()}-${this.sanitizeFilename(file.originalname)}`;
    const url = await this.storage.upload(key, file.buffer, file.mimetype);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } }),
      this.prisma.studentProfile.updateMany({
        where: { userId },
        data: { profilePhotoUrl: url },
      }),
    ]);
    return { avatarUrl: url, profilePhotoUrl: url };
  }

  async adminUploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    await this.ensureUserExists(userId);

    const key = `avatars/${userId}/${Date.now()}-${this.sanitizeFilename(file.originalname)}`;
    const url = await this.storage.upload(key, file.buffer, file.mimetype);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } }),
      this.prisma.studentProfile.updateMany({
        where: { userId },
        data: { profilePhotoUrl: url },
      }),
    ]);

    return { avatarUrl: url, profilePhotoUrl: url };
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

  async getSessions(userId: string, currentSessionId?: string | null) {
    return this.security.listSessions(userId, currentSessionId);
  }

  async revokeSession(userId: string, sessionId: string) {
    return this.security.revokeSession(userId, sessionId, 'user_terminated');
  }

  async exportData(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        profile: true,
        studentProfile: {
          include: {
            educations: true,
            researchInterest: true,
            skills: true,
            experiences: true,
            projects: true,
            publications: true,
            documents: true,
            testScores: true,
            preference: true,
          },
        },
        academicProfile: true,
        credits: true,
        creditTransactions: true,
        subscriptions: { include: { plan: true } },
        applications: { include: { opportunity: true, interviews: true } },
        favorites: { include: { professor: true } },
        savedScholarships: { include: { scholarship: true } },
        emailThreads: true,
        emailMessages: true,
        notifications: true,
        usageMetrics: true,
        invoices: true,
        sessions: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    await this.audit.logUserAction({ userId, action: 'gdpr.export_requested', entityType: 'user' });
    return {
      exportedAt: new Date().toISOString(),
      user,
    };
  }

  async deleteAccount(userId: string) {
    await this.security.revokeAllSessions(userId, 'account_deleted');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
        email: `deleted_${userId}@deleted.local`,
        tokenVersion: { increment: 1 },
      },
    });
    await this.audit.logUserAction({ userId, action: 'gdpr.account_deleted', entityType: 'user' });
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

  async getAdminUserDetail(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        profile: true,
        studentProfile: {
          include: {
            educations: true,
            researchInterest: true,
            skills: true,
            experiences: true,
            projects: true,
            publications: true,
            documents: true,
            testScores: true,
            preference: true,
          },
        },
        credits: true,
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        emailAccounts: {
          orderBy: { createdAt: 'desc' },
        },
        oauthAccounts: {
          orderBy: { createdAt: 'desc' },
        },
        favorites: {
          include: {
            professor: {
              select: { id: true, fullName: true, university: { select: { name: true } } },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        },
        savedScholarships: {
          include: {
            scholarship: {
              select: { id: true, title: true, deadline: true, fundingType: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        },
        emailThreads: {
          include: {
            professor: { select: { id: true, fullName: true } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 3,
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        },
        emailMessages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        imports: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            favorites: true,
            savedScholarships: true,
            emailThreads: true,
            emailMessages: true,
            notifications: true,
            emailAccounts: true,
            oauthAccounts: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...safe } = user as any;
    return safe;
  }

  async adminUpdateUserDetail(userId: string, data: any) {
    const existingUser = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (data.email && data.email !== existingUser.email) {
      const duplicate = await this.prisma.user.findFirst({
        where: { email: data.email, id: { not: userId } },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException('Email already in use');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const userData: any = {};
      if (data.email !== undefined) userData.email = data.email;
      if (data.fullName !== undefined) userData.fullName = data.fullName;
      if (data.avatarUrl !== undefined) userData.avatarUrl = data.avatarUrl;
      if (data.role !== undefined) userData.role = data.role;
      if (data.status !== undefined) userData.status = data.status;
      if (data.emailVerifiedAt !== undefined) {
        userData.emailVerifiedAt = data.emailVerifiedAt ? new Date(data.emailVerifiedAt) : null;
      }

      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userData });
      }

      if (data.profile) {
        await tx.userProfile.upsert({
          where: { userId },
          update: data.profile,
          create: { userId, ...data.profile },
        });
      }

      if (data.studentProfile) {
        await tx.studentProfile.updateMany({
          where: { userId },
          data: {
            ...data.studentProfile,
            ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
          },
        });
      }
    });

    return this.getAdminUserDetail(userId);
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private sanitizeFilename(filename: string) {
    return filename
      .normalize('NFKD')
      .replace(/[^\w.\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
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
