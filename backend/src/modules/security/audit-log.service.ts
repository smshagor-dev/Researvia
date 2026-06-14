import { Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RequestContextService } from '../../shared/request-context/request-context.service';

@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  async logUserAction(params: {
    userId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any> | null;
  }) {
    const ctx = this.requestContext.get();
    await this.prisma.activityLog.create({
      data: {
        userId: params.userId || ctx?.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: ctx?.ip || null,
        userAgent: ctx?.userAgent || null,
        metadata: params.metadata ?? undefined,
      },
    });
  }

  async logAudit(params: {
    actorId?: string | null;
    actorType?: ActorType;
    action: string;
    entityType?: string;
    entityId?: string;
    oldValues?: Record<string, any> | null;
    newValues?: Record<string, any> | null;
  }) {
    const ctx = this.requestContext.get();
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId || ctx?.userId || null,
        actorType: params.actorType || (params.actorId || ctx?.userId ? ActorType.user : ActorType.system),
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues ?? undefined,
        newValues: params.newValues ?? undefined,
        ipAddress: ctx?.ip || null,
      },
    });
  }
}
