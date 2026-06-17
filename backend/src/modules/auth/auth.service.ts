import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, Logger, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import { EmailAccountsService } from '../email-accounts/email-accounts.service';
import { StudentProfileService } from '../student-profile/student-profile.service';
import { SecurityService } from '../security/security.service';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import {
  RegisterDto, LoginDto, ForgotPasswordDto,
  ResetPasswordDto, ChangePasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly encryption: EncryptionService,
    private readonly emailAccounts: EmailAccountsService,
    private readonly studentProfiles: StudentProfileService,
    private readonly security: SecurityService,
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (existing) throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const freePlan = await this.prisma.subscriptionPlan.findUnique({ where: { slug: 'free' } });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: 'user',
        status: 'active',
        profile: { create: {} },
        credits: { create: { balance: freePlan?.creditsPerMonth || 20, lifetimeEarned: freePlan?.creditsPerMonth || 20 } },
        ...(freePlan && {
          subscriptions: {
            create: {
              planId: freePlan.id,
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      },
    });

    await this.recordInitialCreditGrant(user.id, freePlan?.creditsPerMonth || 20, 'signup_free_plan');
    await this.ensureStudentAccessBootstrap(user);

    // Store email verification token
    const verifyToken = this.encryption.randomToken(32);
    await this.redis.set(`verify:${verifyToken}`, user.id, 24 * 3600);

    // TODO: send verification email via queue

    const tokens = await this.generateTokenPair(user, false, { ip, userAgent });
    return {
      ...tokens,
      userId: user.id,
      emailVerificationSent: true,
      nextPath: '/onboarding/student',
    };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    await this.security.assertIpAllowed(ip);
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (!user || !user.passwordHash) {
      await this.security.recordFailedLogin(dto.email, ip, userAgent);
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    await this.security.assertUserUnlocked(user);

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.security.recordFailedLogin(dto.email, ip, userAgent, user.id);
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedException({ code: 'ACCOUNT_SUSPENDED', message: 'Account suspended' });
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!dto.totpCode) {
        // Return temp token
        const tempToken = this.jwt.sign(
          { sub: user.id, type: '2fa_temp' },
          { secret: this.config.get('JWT_SECRET'), expiresIn: '5m' },
        );
        return { requires2FA: true, tempToken };
      }
      const secret = this.encryption.decrypt(user.twoFactorSecret!);
      if (!authenticator.verify({ token: dto.totpCode, secret })) {
        throw new UnauthorizedException({ code: 'INVALID_TOTP', message: 'Invalid TOTP code' });
      }
    }

    await this.security.recordSuccessfulLogin(user.id, ip, userAgent);
    return this.generateTokenPair(user, dto.rememberMe, { ip, userAgent });
  }

  async verifyEmail(token: string) {
    const userId = await this.redis.get(`verify:${token}`);
    if (!userId) throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Invalid or expired verification token' });

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    await this.redis.del(`verify:${token}`);
    return { verified: true };
  }

  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, { secret: this.getRefreshSecret() });
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' });
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN', message: 'Not a refresh token' });
    }

    // Check token in Redis
    const storedHash = await this.redis.get(`refresh:${payload.sub}:${payload.sessionId}`);
    if (!storedHash || storedHash !== this.encryption.hash(refreshToken)) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token revoked' });
    }

    const user = await this.prisma.user.findFirst({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token version expired' });
    }
    await this.security.assertIpAllowed(ip);
    await this.security.validateSession(user.id, payload.sessionId);

    // Revoke old refresh token
    await this.redis.del(`refresh:${payload.sub}:${payload.sessionId}`);
    return this.generateTokenPair(user, payload.rememberMe, {
      ip,
      userAgent,
      existingSessionId: payload.sessionId,
    });
  }

  async logout(userId: string, sessionId: string) {
    return this.security.revokeSession(userId, sessionId, 'logout');
  }

  async logoutAll(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return this.security.revokeAllSessions(userId, 'logout_all');
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email } });
    // Always return success to prevent email enumeration
    if (!user) return { sent: true };

    const token = this.encryption.randomToken(32);
    await this.redis.set(`reset:${this.encryption.hash(token)}`, user.id, 3600);

    // TODO: send password reset email via queue
    this.logger.log(`Password reset token for ${dto.email}: ${token}`);

    return { sent: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.encryption.hash(dto.token);
    const userId = await this.redis.get(`reset:${tokenHash}`);
    if (!userId) throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' });

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });
    await this.redis.del(`reset:${tokenHash}`);
    await this.security.revokeAllSessions(userId, 'password_reset');
    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('No password set');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException({ code: 'WRONG_PASSWORD', message: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });
    await this.security.revokeAllSessions(userId, 'password_change');
    return { success: true };
  }

  async enable2FA(userId: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('No password set');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException({ code: 'WRONG_PASSWORD', message: 'Invalid password' });

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'ResearVia', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    const backupCodes = Array.from({ length: 10 }, () => this.encryption.randomToken(4));
    const backupHashes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

    // Store temp secret until confirmed
    await this.redis.set(`2fa_setup:${userId}`, JSON.stringify({ secret, backupHashes }), 600);

    return { secret, otpAuthUrl, qrCodeDataUrl, backupCodes };
  }

  async confirm2FA(userId: string, totpCode: string) {
    const setupData = await this.redis.get(`2fa_setup:${userId}`);
    if (!setupData) throw new BadRequestException({ code: 'NO_SETUP', message: 'Start 2FA setup first' });

    const { secret, backupHashes } = JSON.parse(setupData);
    if (!authenticator.verify({ token: totpCode, secret })) {
      throw new BadRequestException({ code: 'INVALID_TOTP', message: 'Invalid TOTP code' });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: this.encryption.encrypt(secret),
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupHashes,
      },
    });
    await this.redis.del(`2fa_setup:${userId}`);
    return { enabled: true };
  }

  async disable2FA(userId: string, totpCode: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new BadRequestException('2FA not enabled');

    const secret = this.encryption.decrypt(user.twoFactorSecret);
    if (!authenticator.verify({ token: totpCode, secret })) {
      throw new UnauthorizedException({ code: 'INVALID_TOTP', message: 'Invalid TOTP code' });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabled: false, twoFactorBackupCodes: Prisma.JsonNull },
    });
    return { disabled: true };
  }

  async handleOAuthCallback(
    provider: 'google' | 'microsoft',
    profile: { id: string; email: string; displayName: string; photo?: string },
    tokens: { accessToken: string; refreshToken?: string; expiresAt?: Date },
  ) {
    let user = await this.prisma.user.findFirst({ where: { email: profile.email } });

    if (!user) {
      const freePlan = await this.prisma.subscriptionPlan.findUnique({ where: { slug: 'free' } });
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          fullName: profile.displayName,
          avatarUrl: profile.photo,
          role: 'user',
          status: 'active',
          emailVerifiedAt: new Date(),
          profile: { create: {} },
          credits: { create: { balance: 20, lifetimeEarned: 20 } },
          ...(freePlan && {
            subscriptions: {
              create: {
                planId: freePlan.id,
                status: 'active',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          }),
        },
      });

      await this.recordInitialCreditGrant(user.id, freePlan?.creditsPerMonth || 20, 'oauth_free_plan');
      await this.ensureStudentAccessBootstrap(user);
    }

    // Upsert OAuth account
    await this.prisma.oauthAccount.upsert({
      where: { userId_provider_providerAccountId: { userId: user.id, provider, providerAccountId: profile.id } },
      update: {
        accessToken: this.encryption.encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? this.encryption.encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt,
      },
      create: {
        userId: user.id,
        provider,
        providerAccountId: profile.id,
        email: profile.email,
        accessToken: this.encryption.encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? this.encryption.encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt,
      },
    });

    return this.generateTokenPair(user, false);
  }

  private async generateTokenPair(
    user: any,
    rememberMe = false,
    context?: { ip?: string | null; userAgent?: string | null; existingSessionId?: string },
  ) {
    const sessionUser = await this.buildSessionUser(user);
    const sessionId = context?.existingSessionId || uuidv4();
    const refreshExpiresIn = rememberMe ? '365d' : this.config.get('JWT_REFRESH_EXPIRES', '30d');
    const refreshTtl = rememberMe ? 365 * 24 * 3600 : 30 * 24 * 3600;
    const tokenVersion = user.tokenVersion || 0;

    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, sessionId, tokenVersion },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m') },
    );

    const refreshToken = this.jwt.sign(
      { sub: user.id, sessionId, type: 'refresh', rememberMe, tokenVersion },
      { secret: this.getRefreshSecret(), expiresIn: refreshExpiresIn },
    );

    // Store refresh token hash in Redis
    const refreshTokenHash = this.encryption.hash(refreshToken);
    await this.redis.set(`refresh:${user.id}:${sessionId}`, refreshTokenHash, refreshTtl);
    const expiresAt = new Date(Date.now() + refreshTtl * 1000);

    if (context?.existingSessionId) {
      await this.security.rotateSession(user.id, sessionId, refreshTokenHash, expiresAt);
    } else {
      await this.security.createSession({
        userId: user.id,
        sessionId,
        refreshTokenHash,
        expiresAt,
        ip: context?.ip,
        userAgent: context?.userAgent,
      });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: sessionUser,
    };
  }

  private async ensureStudentAccessBootstrap(user: any) {
    const normalizedRole = String(user.role || '').toLowerCase();
    if (!['user', 'student'].includes(normalizedRole)) {
      return;
    }

    try {
      await this.emailAccounts.provisionSystemMailboxForUser(user);
    } catch (error: any) {
      this.logger.warn(`System mailbox bootstrap failed for ${user.id}: ${error.message}`);
    }
    await this.studentProfiles.ensureStudentProfileForUser(user);
  }

  private async buildSessionUser(user: any) {
    await this.ensureStudentAccessBootstrap(user);
    const studentMeta = await this.studentProfiles.getStudentSessionMeta(user.id);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      ...studentMeta,
    };
  }

  private async recordInitialCreditGrant(userId: string, amount: number, reason: string) {
    const credits = await this.prisma.credits.findUnique({
      where: { userId },
      select: { id: true, balance: true },
    });
    if (!credits || amount <= 0) {
      return;
    }

    const existing = await this.prisma.creditTransaction.findFirst({
      where: {
        userId,
        type: 'bonus',
        reason,
      },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    await this.prisma.creditTransaction.create({
      data: {
        userId,
        walletId: credits.id,
        amount,
        type: 'bonus',
        reason,
        description: 'Initial free plan credits',
        balanceAfter: credits.balance,
        metadataJson: { source: reason } as Prisma.InputJsonValue,
      },
    });
  }

  private getRefreshSecret() {
    return this.config.get('JWT_REFRESH_SECRET') || this.config.get('JWT_SECRET');
  }
}
