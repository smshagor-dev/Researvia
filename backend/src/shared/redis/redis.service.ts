import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getRedisConnectionOptions, hasRedisConfiguration } from './redis.config';
import { redisLatency } from '../../modules/observability/metrics.registry';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;
  private useMemoryFallback = false;
  private readonly memoryStore = new Map<string, { value: string; expiresAt?: number }>();
  private readonly memoryHashes = new Map<string, Map<string, string>>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (!hasRedisConfiguration(this.config)) {
      if (isProduction) {
        throw new Error('Redis is required in production. Configure REDIS_HOST/REDIS_PORT or REDIS_URL.');
      }
      this.useMemoryFallback = true;
      this.logger.warn('Redis is not configured, using in-memory fallback outside production');
      return;
    }

    const connection = getRedisConnectionOptions(this.config);
    this.client = new Redis({
      ...connection,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: () => null,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (e) => this.logger.warn(`Redis error: ${e.message}`));

    try {
      await this.client.connect();
    } catch (e) {
      if (isProduction) {
        throw new Error(`Redis connection failed in production: ${(e as Error).message}`);
      }
      this.useMemoryFallback = true;
      this.logger.warn(`Redis unavailable, using in-memory fallback: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client && !this.useMemoryFallback) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    if (!this.client || this.useMemoryFallback) {
      throw new Error('Redis client is unavailable; in-memory fallback is active');
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    const startedAt = Date.now();
    if (this.useMemoryFallback) {
      this.deleteIfExpired(key);
      const value = this.memoryStore.get(key)?.value ?? null;
      redisLatency.observe({ command: 'get' }, Date.now() - startedAt);
      return value;
    }
    const value = await this.client!.get(key);
    redisLatency.observe({ command: 'get' }, Date.now() - startedAt);
    return value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const startedAt = Date.now();
    if (this.useMemoryFallback) {
      this.memoryStore.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      });
      redisLatency.observe({ command: 'set' }, Date.now() - startedAt);
      return;
    }

    if (ttlSeconds) {
      await this.client!.setex(key, ttlSeconds, value);
    } else {
      await this.client!.set(key, value);
    }
    redisLatency.observe({ command: 'set' }, Date.now() - startedAt);
  }

  async del(key: string): Promise<void> {
    const startedAt = Date.now();
    if (this.useMemoryFallback) {
      this.memoryStore.delete(key);
      this.memoryHashes.delete(key);
      redisLatency.observe({ command: 'del' }, Date.now() - startedAt);
      return;
    }
    await this.client!.del(key);
    redisLatency.observe({ command: 'del' }, Date.now() - startedAt);
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.useMemoryFallback) {
      this.purgeExpired();
      const regex = this.patternToRegex(pattern);
      const keys = [...this.memoryStore.keys(), ...this.memoryHashes.keys()];
      return [...new Set(keys)].filter((key) => regex.test(key));
    }
    return this.client!.keys(pattern);
  }

  async delPattern(pattern: string): Promise<void> {
    if (this.useMemoryFallback) {
      const keys = await this.keys(pattern);
      keys.forEach((key) => {
        this.memoryStore.delete(key);
        this.memoryHashes.delete(key);
      });
      return;
    }

    const keys = await this.client!.keys(pattern);
    if (keys.length > 0) {
      await this.client!.del(...keys);
    }
  }

  async incr(key: string): Promise<number> {
    const startedAt = Date.now();
    if (this.useMemoryFallback) {
      const previous = this.memoryStore.get(key);
      const current = Number(previous?.value ?? 0) + 1;
      this.memoryStore.set(key, { value: String(current), expiresAt: previous?.expiresAt });
      redisLatency.observe({ command: 'incr' }, Date.now() - startedAt);
      return current;
    }
    const value = await this.client!.incr(key);
    redisLatency.observe({ command: 'incr' }, Date.now() - startedAt);
    return value;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (this.useMemoryFallback) {
      const entry = this.memoryStore.get(key);
      if (entry) entry.expiresAt = Date.now() + ttlSeconds * 1000;
      return;
    }
    await this.client!.expire(key, ttlSeconds);
  }

  async exists(key: string): Promise<boolean> {
    if (this.useMemoryFallback) {
      this.deleteIfExpired(key);
      return this.memoryStore.has(key) || this.memoryHashes.has(key);
    }
    const result = await this.client!.exists(key);
    return result === 1;
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (this.useMemoryFallback) {
      const hash = this.memoryHashes.get(key) ?? new Map<string, string>();
      hash.set(field, value);
      this.memoryHashes.set(key, hash);
      return;
    }
    await this.client!.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (this.useMemoryFallback) {
      return this.memoryHashes.get(key)?.get(field) ?? null;
    }
    return this.client!.hget(key, field);
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    if (this.useMemoryFallback) {
      const hash = this.memoryHashes.get(key);
      fields.forEach((field) => hash?.delete(field));
      return;
    }
    await this.client!.hdel(key, ...fields);
  }

  async publish(channel: string, message: string): Promise<void> {
    if (this.useMemoryFallback) return;
    await this.client!.publish(channel, message);
  }

  private deleteIfExpired(key: string) {
    const entry = this.memoryStore.get(key);
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
    }
  }

  private purgeExpired() {
    this.memoryStore.forEach((_, key) => this.deleteIfExpired(key));
  }

  private patternToRegex(pattern: string) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }
}
