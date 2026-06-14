import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { SecurityService } from './security.service';
import { AdminAuditInterceptor } from './admin-audit.interceptor';

@Global()
@Module({
  providers: [AuditLogService, SecurityService, AdminAuditInterceptor],
  exports: [AuditLogService, SecurityService, AdminAuditInterceptor],
})
export class SecurityModule {}
