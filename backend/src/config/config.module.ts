import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('30d'),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  MICROSOFT_CLIENT_ID: Joi.string().allow('').optional(),
  MICROSOFT_CLIENT_SECRET: Joi.string().allow('').optional(),
  MICROSOFT_TENANT_ID: Joi.string().default('common'),
  S3_ENDPOINT: Joi.string().allow('').optional(),
  S3_BUCKET: Joi.string().optional().default('profcrm'),
  S3_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  S3_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  S3_REGION: Joi.string().default('us-east-1'),
  STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  OPENAI_API_KEY: Joi.string().allow('').optional(),
  ENCRYPTION_KEY: Joi.string().min(32).default('0123456789abcdef0123456789abcdef'),
  APP_URL: Joi.string().default('http://localhost:3001'),
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),
  SYSTEM_EMAIL_FROM: Joi.string().default('noreply@profcrm.com'),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  OPENALEX_EMAIL: Joi.string().optional().default('admin@profcrm.com'),
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
