import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  BACKEND_URL: Joi.string().uri().optional(),
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().hostname().optional(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().min(0).default(0),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('30d'),
  STORAGE_DRIVER: Joi.string().valid('local', 's3', 'r2').default('local'),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  MICROSOFT_CLIENT_ID: Joi.string().allow('').optional(),
  MICROSOFT_CLIENT_SECRET: Joi.string().allow('').optional(),
  MICROSOFT_TENANT_ID: Joi.string().default('common'),
  S3_ENDPOINT: Joi.string().allow('').optional(),
  S3_BUCKET: Joi.string().optional().default('researvia'),
  S3_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  S3_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  S3_REGION: Joi.string().default('us-east-1'),
  STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  SENTRY_DSN: Joi.string().allow('').optional(),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0.1),
  OTEL_ENABLED: Joi.string().valid('true', 'false').default('false'),
  OTEL_SERVICE_NAME: Joi.string().default('researvia-backend'),
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  OPENAI_API_KEY: Joi.string().allow('').optional(),
  ENCRYPTION_KEY: Joi.string().min(32).default('0123456789abcdef0123456789abcdef'),
  APP_URL: Joi.string().default('http://localhost:3001'),
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),
  SYSTEM_EMAIL_FROM: Joi.string().default('noreply@researvia.com'),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  OPENALEX_BASE_URL: Joi.string().uri().default('https://api.openalex.org'),
  OPENALEX_EMAIL: Joi.string().optional().default('ops@researvia.com'),
  ORCID_BASE_URL: Joi.string().uri().default('https://pub.orcid.org/v3.0'),
  CROSSREF_BASE_URL: Joi.string().uri().default('https://api.crossref.org'),
  ROR_BASE_URL: Joi.string().uri().default('https://api.ror.org'),
  DISCOVERY_DAILY_CRON: Joi.string().default('0 2 * * *'),
  PROFILE_SYNC_DAILY_CRON: Joi.string().default('0 3 * * *'),
  PUBLICATION_SYNC_DAILY_CRON: Joi.string().default('0 4 * * *'),
  QUALITY_SCORE_DAILY_CRON: Joi.string().default('0 5 * * *'),
  DEDUP_WEEKLY_CRON: Joi.string().default('0 3 * * 0'),
  DAAD_API_URL: Joi.string().allow('').optional(),
  ERASMUS_API_URL: Joi.string().allow('').optional(),
  FULBRIGHT_API_URL: Joi.string().allow('').optional(),
  CHEVENING_API_URL: Joi.string().allow('').optional(),
  MEXT_API_URL: Joi.string().allow('').optional(),
  COMMONWEALTH_API_URL: Joi.string().allow('').optional(),
  UNIVERSITY_SCHOLARSHIP_API_URL: Joi.string().allow('').optional(),
  SCHOLARSHIP_DISCOVERY_CRON: Joi.string().default('0 1 * * *'),
  SCHOLARSHIP_SYNC_CRON: Joi.string().default('0 2 * * *'),
  SCHOLARSHIP_DEADLINE_CRON: Joi.string().default('0 3 * * *'),
  SCHOLARSHIP_QUALITY_CRON: Joi.string().default('0 4 * * *'),
  WORKER_HEARTBEAT_INTERVAL_MS: Joi.number().min(5000).default(30000),
  WORKER_OFFLINE_THRESHOLD_MS: Joi.number().min(10000).default(60000),
  QUEUE_STUCK_JOB_THRESHOLD_MS: Joi.number().min(60000).default(900000),
  WORKER_VERSION: Joi.string().default('1.0.0'),
  BACKUP_DATABASE_CRON: Joi.string().default('0 1 * * *'),
  BACKUP_STORAGE_CRON: Joi.string().default('0 2 * * 0'),
  BACKUP_FULL_SNAPSHOT_CRON: Joi.string().default('0 3 1 * *'),
}).custom((value, helpers) => {
  if (value.NODE_ENV === 'production') {
    if (!value.REDIS_URL && !value.REDIS_HOST) {
      return helpers.error('any.invalid', { message: 'Redis must be configured in production.' });
    }
    if (value.ENCRYPTION_KEY === '0123456789abcdef0123456789abcdef') {
      return helpers.error('any.invalid', { message: 'ENCRYPTION_KEY must be overridden in production.' });
    }
    if (value.JWT_SECRET === 'dev-secret-change-in-production') {
      return helpers.error('any.invalid', { message: 'JWT_SECRET must not use a development default.' });
    }
    if (value.STORAGE_DRIVER !== 'local' && (!value.S3_BUCKET || !value.S3_ACCESS_KEY_ID || !value.S3_SECRET_ACCESS_KEY)) {
      return helpers.error('any.invalid', { message: 'S3/R2 storage requires bucket and credentials.' });
    }
  }
  return value;
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
