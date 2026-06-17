import { Injectable } from '@nestjs/common';
import { Prisma, SystemSetting } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

const DEFAULT_SYSTEM_SETTINGS: Record<string, unknown> = {
  'billing.nowpayments.api_url': 'https://api.nowpayments.io/v1',
  'billing.nowpayments.supported_currencies': ['btc', 'eth', 'usdttrc20'],
  'email.allow_fallback': false,
};

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private get delegate() {
    return (this.prisma as any).systemSetting as {
      findMany: (args?: any) => Promise<SystemSetting[]>;
      findUnique: (args: any) => Promise<SystemSetting | null>;
      upsert: (args: any) => Promise<SystemSetting>;
      deleteMany: (args: any) => Promise<{ count: number }>;
    };
  }

  async list(prefix?: string) {
    const rows = await this.delegate.findMany({
      where: prefix ? { key: { startsWith: prefix } } : undefined,
      orderBy: { key: 'asc' },
    });

    return rows.map((row) => ({
      key: row.key,
      value: row.valueJson,
      description: row.description,
      source: 'database' as const,
      updatedAt: row.updatedAt,
    }));
  }

  async getAllResolved(prefix?: string) {
    const dbRows = await this.delegate.findMany({
      where: prefix ? { key: { startsWith: prefix } } : undefined,
      orderBy: { key: 'asc' },
    });
    const dbMap = new Map<string, SystemSetting>(dbRows.map((row) => [row.key, row]));
    const keys = new Set<string>([
      ...Object.keys(DEFAULT_SYSTEM_SETTINGS).filter((key) => !prefix || key.startsWith(prefix)),
      ...dbRows.map((row) => row.key),
    ]);

    return Array.from(keys)
      .sort()
      .map((key) => {
        const dbValue = dbMap.get(key);
        return {
          key,
          value: dbValue?.valueJson ?? DEFAULT_SYSTEM_SETTINGS[key] ?? null,
          description: dbValue?.description || null,
          source: dbValue ? 'database' as const : 'default' as const,
          updatedAt: dbValue?.updatedAt || null,
        };
      });
  }

  async setMany(items: Array<{ key: string; value: unknown; description?: string | null }>) {
    const normalized = items
      .filter((item) => item?.key?.trim())
      .map((item) => ({
        key: item.key.trim(),
        valueJson: item.value as Prisma.InputJsonValue,
        description: item.description ?? null,
      }));

    if (!normalized.length) {
      return [];
    }

    for (const item of normalized) {
      await this.delegate.upsert({
        where: { key: item.key },
        create: item,
        update: {
          valueJson: item.valueJson,
          description: item.description,
        },
      });
    }

    return this.getAllResolved();
  }

  async remove(key: string) {
    await this.delegate.deleteMany({ where: { key } });
    return { deleted: true };
  }

  async get<T = unknown>(key: string, fallback?: T): Promise<T | null> {
    const row = await this.delegate.findUnique({ where: { key } });
    if (row?.valueJson !== undefined && row?.valueJson !== null) {
      return row.valueJson as T;
    }
    if (DEFAULT_SYSTEM_SETTINGS[key] !== undefined) {
      return DEFAULT_SYSTEM_SETTINGS[key] as T;
    }
    return fallback ?? null;
  }

  async getString(key: string, fallback?: string) {
    const value = await this.get<unknown>(key, fallback);
    return typeof value === 'string' ? value : fallback ?? null;
  }

  async getBoolean(key: string, fallback = false) {
    const value = await this.get<unknown>(key, fallback);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return fallback;
  }

  async getNumber(key: string, fallback?: number) {
    const value = await this.get<unknown>(key, fallback);
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return fallback ?? null;
  }

  async getStringArray(key: string, fallback: string[] = []) {
    const value = await this.get<unknown>(key, fallback);
    if (Array.isArray(value)) {
      return value.map(String).map((item) => item.trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return fallback;
  }
}
