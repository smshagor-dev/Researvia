import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import { SecurityService } from '../../modules/security/security.service';
import { JwtPayload } from '../types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService,
    private readonly security: SecurityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('is_public', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('No token provided');

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, status: true, tokenVersion: true },
      });

      if (!user || user.status === 'deleted') {
        throw new UnauthorizedException('Account not found');
      }

      if (user.status === 'suspended') {
        throw new ForbiddenException('Account suspended');
      }

      if ((payload as any).tokenVersion !== user.tokenVersion) {
        throw new UnauthorizedException('Token version expired');
      }

      await this.security.validateSession(user.id, payload.sessionId);
      await this.security.touchSession(user.id, payload.sessionId);

      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        sessionId: payload.sessionId,
      };
      this.requestContext.assign({
        userId: user.id,
        sessionId: payload.sessionId,
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }
}

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) return true;

    try {
      const token = authHeader.slice(7);
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      request.user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      // ignore invalid token on optional routes
    }
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new UnauthorizedException();

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
