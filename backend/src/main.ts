import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import * as express from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as Sentry from '@sentry/node';
import pinoHttp from 'pino-http';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';
import { RequestContextService } from './shared/request-context/request-context.service';
import { ObservabilityService } from './modules/observability/observability.service';
import { requestCounter, errorCounter, requestDuration } from './modules/observability/metrics.registry';
import { startOpenTelemetry } from './modules/observability/otel';

async function bootstrap() {
  await startOpenTelemetry();

  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    });
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['error', 'warn', 'log', 'debug'],
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Cache-Control', 'Pragma', 'Expires'],
    },
  });

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(compression());
  app.use(pinoHttp({
    quietReqLogger: true,
    genReqId: (req) => String(req.headers['x-request-id'] || randomUUID()),
    customProps: (req: any) => ({ ip: req.ip, path: req.url }),
  }));

  const requestContext = app.get(RequestContextService);
  const observability = app.get(ObservabilityService);

  app.use((req, res, next) => {
    const startedAt = Date.now();
    const requestId = String(req.headers['x-request-id'] || randomUUID());
    requestContext.run({
      requestId,
      ip: req.ip,
      userAgent: req.get('user-agent') || null,
      path: req.originalUrl || req.url,
      method: req.method,
    }, () => {
      res.on('finish', () => {
        const route = req.route?.path || req.originalUrl || req.url || 'unknown';
        const labels = { method: req.method, route, status_code: String(res.statusCode) };
        requestCounter.inc(labels);
        requestDuration.observe(labels, Date.now() - startedAt);
        if (res.statusCode >= 400) {
          errorCounter.inc(labels);
        }
      });
      next();
    });
  });

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  app.use('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', await observability.getContentType());
    res.send(await observability.getMetricsText());
  });

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('ProfCRM API')
    .setDescription('Professor Outreach, Scholarship & Research CRM Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(process.env.APP_URL || 'http://localhost:3001', 'API Server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3001;
  app.enableShutdownHooks();
  await app.listen(port);
  console.log(`🚀 ProfCRM API running on http://localhost:${port}/v1`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
