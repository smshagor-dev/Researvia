import type { ConfigService } from '@nestjs/config';

export type RedisConnectionOptions = {
  family: 4;
  host: string;
  port: number;
  password?: string;
  db: number;
};

export function hasRedisConfiguration(config: ConfigService): boolean {
  return Boolean(config.get<string>('REDIS_URL') || config.get<string>('REDIS_HOST'));
}

export function getRedisConnectionOptions(config: ConfigService): RedisConnectionOptions {
  const redisUrl = config.get<string>('REDIS_URL');
  if (redisUrl) {
    const parsed = new URL(redisUrl);

    return {
      family: 4,
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: parsed.password || undefined,
      db: parsed.pathname ? Number(parsed.pathname.replace('/', '') || 0) : 0,
    };
  }

  return {
    family: 4,
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: config.get<number>('REDIS_PORT', 6379),
    password: config.get<string>('REDIS_PASSWORD') || undefined,
    db: config.get<number>('REDIS_DB', 0),
  };
}
