import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = String(request.method || 'GET').toUpperCase();
    const shouldTrack = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && String(request.originalUrl || request.url || '').includes('/admin/');
    const actorId = request.user?.id as string | undefined;
    const path = request.originalUrl || request.url;

    return next.handle().pipe(
      tap((response) => {
        if (!shouldTrack) return;
        void this.audit.logAudit({
          actorId,
          actorType: 'admin' as any,
          action: `admin.${method.toLowerCase()}`,
          entityType: 'admin_action',
          entityId: path,
          newValues: {
            params: request.params,
            query: request.query,
            body: request.body,
            responseSummary: response?.id ? { id: response.id } : undefined,
          },
        }).catch(() => undefined);
      }),
    );
  }
}
