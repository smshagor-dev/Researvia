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
  ) {}

  async register(dto: RegisterDto) {
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

    await this.emailAccounts.provisionSystemMailboxForUser(user);

    // Store email verification token
    const verifyToken = this.encryption.randomToken(32);
    await this.redis.set(`verify:${verifyToken}`, user.id, 24 * 3600);

    // TODO: send verification email via queue

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      emailVerificationSent: true,
    };
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
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

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    return this.generateTokenPair(user, dto.rememberMe);
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

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, { secret: this.config.get('JWT_SECRET') });
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

    // Revoke old refresh token
    await this.redis.del(`refresh:${payload.sub}:${payload.sessionId}`);

    return this.generateTokenPair(user, payload.rememberMe);
  }

  async logout(userId: string, sessionId: string) {
    await this.redis.del(`refresh:${userId}:${sessionId}`);
    return { success: true };
  }

  async logoutAll(userId: string) {
    await this.redis.delPattern(`refresh:${userId}:*`);
    return { success: true };
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
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.redis.del(`reset:${tokenHash}`);
    await this.redis.delPattern(`refresh:${userId}:*`);
    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('No password set');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException({ code: 'WRONG_PASSWORD', message: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.redis.delPattern(`refresh:${userId}:*`);
    return { success: true };
  }

  async enable2FA(userId: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('No password set');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException({ code: 'WRONG_PASSWORD', message: 'Invalid password' });

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'ProfCRM', secret);
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

      await this.emailAccounts.provisionSystemMailboxForUser(user);
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

    return this.generateTokenPair(user);
  }

  private async generateTokenPair(user: any, rememberMe = false) {
    const sessionId = uuidv4();
    const refreshExpiresIn = rememberMe ? '365d' : this.config.get('JWT_REFRESH_EXPIRES', '30d');
    const refreshTtl = rememberMe ? 365 * 24 * 3600 : 30 * 24 * 3600;

    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, sessionId },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m') },
    );

    const refreshToken = this.jwt.sign(
      { sub: user.id, sessionId, type: 'refresh', rememberMe },
      { secret: this.config.get('JWT_SECRET'), expiresIn: refreshExpiresIn },
    );

    // Store refresh token hash in Redis
    await this.redis.set(`refresh:${user.id}:${sessionId}`, this.encryption.hash(refreshToken), refreshTtl);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
