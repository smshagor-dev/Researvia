import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { RequestContextModule } from './shared/request-context/request-context.module';
import { RedisModule } from './shared/redis/redis.module';
import { StorageModule } from './modules/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UniversitiesModule } from './modules/universities/universities.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ProfessorsModule } from './modules/professors/professors.module';
import { ProfessorEmailsModule } from './modules/professor-emails/professor-emails.module';
import { ResearchAreasModule } from './modules/research-areas/research-areas.module';
import { PublicationsModule } from './modules/publications/publications.module';
import { ScholarshipsModule } from './modules/scholarships/scholarships.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { EmailAccountsModule } from './modules/email-accounts/email-accounts.module';
import { EmailThreadsModule } from './modules/email-threads/email-threads.module';
import { EmailMessagesModule } from './modules/email-messages/email-messages.module';
import { EmailRealtimeModule } from './modules/email-realtime/email-realtime.module';
import { InboxSyncModule } from './modules/inbox-sync/inbox-sync.module';
import { AiModule } from './modules/ai/ai.module';
import { SearchModule } from './modules/search/search.module';
import { CreditsModule } from './modules/credits/credits.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdminProfessorsModule } from './modules/admin-professors/admin-professors.module';
import { StudentProfileModule } from './modules/student-profile/student-profile.module';
import { HealthModule } from './modules/health/health.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { QueuesModule } from './queues/queues.module';
import { CronModule } from './cron/cron.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { FacultyScraperModule } from './modules/faculty-scraper/faculty-scraper.module';
import { ProfessorSyncModule } from './modules/professor-sync/professor-sync.module';
import { SyncLogsModule } from './modules/sync-logs/sync-logs.module';
import { SystemHealthModule } from './modules/system-health/system-health.module';
import { OutreachModule } from './modules/outreach/outreach.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { SecurityModule } from './modules/security/security.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { BackupsModule } from './modules/backups/backups.module';
import { AdminAuditInterceptor } from './modules/security/admin-audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    AppConfigModule,
    PrismaModule,
    RequestContextModule,
    RedisModule,
    StorageModule,
    AuthModule,
    UsersModule,
    UniversitiesModule,
    DepartmentsModule,
    ProfessorsModule,
    ProfessorEmailsModule,
    ResearchAreasModule,
    PublicationsModule,
    ScholarshipsModule,
    FavoritesModule,
    EmailAccountsModule,
    EmailThreadsModule,
    EmailMessagesModule,
    EmailRealtimeModule,
    InboxSyncModule,
    AiModule,
    SearchModule,
    CreditsModule,
    SubscriptionsModule,
    BillingModule,
    NotificationsModule,
    AnalyticsModule,
    StudentProfileModule,
    AdminModule,
    AdminProfessorsModule,
    HealthModule,
    WebhooksModule,
    DiscoveryModule,
    FacultyScraperModule,
    ProfessorSyncModule,
    SyncLogsModule,
    SystemHealthModule,
    OutreachModule,
    OpportunitiesModule,
    SecurityModule,
    ObservabilityModule,
    BackupsModule,
    QueuesModule,
    CronModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AdminAuditInterceptor },
  ],
})
export class AppModule {}
