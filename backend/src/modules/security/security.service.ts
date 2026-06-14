import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { AuditLogService } from './audit-log.service';

const LOGIN_FAILURE_LOCK_THRESHOLD = 5;
const LOGIN_FAILURE_LOCK_MINUTES = 30;
const IP_REPUTATION_BLOCK_THRESHOLD = 20;
const MAX_CONCURRENT_SESSIONS = 10;

@Injectable()
export class SecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditLogService,
  ) {}

  async assertIpAllowed(ip?: string | null) {
    if (!ip) return;
    const reputation = await this.prisma.ipReputation.findUnique({ where: { ipAddress: ip } });
    if (reputation?.blockedUntil && reputation.blockedUntil > new Date()) {
      throw new ForbiddenException({
        code: 'IP_BLOCKED',
        message: 'Too many suspicious requests from this IP address.',
      });
    }
  }

  async assertUserUnlocked(user: Pick<User, 'id' | 'lockedUntil'>) {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_LOCKED',
        message: 'Account temporarily locked due to repeated failed login attempts.',
      });
    }
  }

  async recordFailedLogin(email: string, ip?: string | null, userAgent?: string | null, userId?: string | null) {
    const blockedUntil = new Date(Date.now() + LOGIN_FAILURE_LOCK_MINUTES * 60 * 1000);

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const nextAttempts = user.failedLoginAttempts + 1;
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            failedLoginAttempts: nextAttempts,
            lockedUntil: nextAttempts >= LOGIN_FAILURE_LOCK_THRESHOLD ? blockedUntil : user.lockedUntil,
          },
        });
      }
    }

    if (ip) {
      const current = await this.prisma.ipReputation.findUnique({ where: { ipAddress: ip } });
      const nextScore = (current?.reputationScore || 0) + 5;
      await this.prisma.ipReputation.upsert({
        where: { ipAddress: ip },
        update: {
          reputationScore: nextScore,
          failedAttempts: { increment: 1 },
          suspiciousEvents: { increment: 1 },
          blockedUntil: nextScore >= IP_REPUTATION_BLOCK_THRESHOLD ? blockedUntil : current?.blockedUntil,
          lastUserAgent: userAgent || undefined,
          lastSeenAt: new Date(),
        },
        create: {
          ipAddress: ip,
          reputationScore: nextScore,
          failedAttempts: 1,
          suspiciousEvents: 1,
          blockedUntil: nextScore >= IP_REPUTATION_BLOCK_THRESHOLD ? blockedUntil : null,
          lastUserAgent: userAgent || undefined,
        },
      });
    }

    await this.audit.logUserAction({
      userId,
      action: 'auth.login_failed',
      entityType: 'auth',
      metadata: { email, ip, userAgent },
    });
  }

  async recordSuccessfulLogin(userId: string, ip?: string | null, userAgent?: string | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip || undefined,
      },
    });

    if (ip) {
      await this.prisma.ipReputation.upsert({
        where: { ipAddress: ip },
        update: {
          reputationScore: { decrement: 1 },
          successfulAttempts: { increment: 1 },
          lastSeenAt: new Date(),
          lastUserAgent: userAgent || undefined,
        },
        create: {
          ipAddress: ip,
          reputationScore: 0,
          successfulAttempts: 1,
          lastUserAgent: userAgent || undefined,
        },
      });
    }

    await this.audit.logUserAction({
      userId,
      action: 'auth.login',
      entityType: 'auth',
      metadata: { ip, userAgent },
    });
  }

  async createSession(params: {
    userId: string;
    sessionId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    await this.prisma.activeSession.create({
      data: {
        id: params.sessionId,
        userId: params.userId,
        refreshTokenHash: params.refreshTokenHash,
        expiresAt: params.expiresAt,
        ipAddress: params.ip || undefined,
        userAgent: params.userAgent || undefined,
      },
    });

    const activeSessions = await this.prisma.activeSession.count({
      where: { userId: params.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    if (activeSessions > MAX_CONCURRENT_SESSIONS) {
      await this.audit.logUserAction({
        userId: params.userId,
        action: 'security.suspicious_session_volume',
        entityType: 'session',
        entityId: params.sessionId,
        metadata: { activeSessions, ip: params.ip, userAgent: params.userAgent },
      });
    }
  }

  async rotateSession(userId: string, sessionId: string, refreshTokenHash: string, expiresAt: Date) {
    await this.prisma.activeSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: {
        refreshTokenHash,
        expiresAt,
        lastActivityAt: new Date(),
        rotationCounter: { increment: 1 },
      },
    });
  }

  async touchSession(userId: string, sessionId?: string | null) {
    if (!sessionId) return;
    await this.prisma.activeSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { lastActivityAt: new Date() },
    });
  }

  async validateSession(userId: string, sessionId?: string | null) {
    if (!sessionId) return null;
    const session = await this.prisma.activeSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!session) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message: 'Session is no longer active.',
      });
    }
    return session;
  }

  async revokeSession(userId: string, sessionId: string, reason = 'manual_revocation') {
    await this.redis.del(`refresh:${userId}:${sessionId}`);
    await this.prisma.activeSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
    await this.audit.logUserAction({
      userId,
      action: 'auth.session_revoked',
      entityType: 'session',
      entityId: sessionId,
      metadata: { reason },
    });
    return { success: true };
  }

  async revokeAllSessions(userId: string, reason = 'logout_all') {
    await this.redis.delPattern(`refresh:${userId}:*`);
    await this.prisma.activeSession.updateMany({
      where: { userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
    await this.audit.logUserAction({
      userId,
      action: 'auth.logout_all',
      entityType: 'session',
      metadata: { reason },
    });
    return { success: true };
  }

  async listSessions(userId: string, currentSessionId?: string | null) {
    const sessions = await this.prisma.activeSession.findMany({
      where: { userId },
      orderBy: { lastActivityAt: 'desc' },
    });
    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        revokeReason: session.revokeReason,
        createdAt: session.createdAt,
        isCurrent: session.id === currentSessionId,
      })),
    };
  }
}
