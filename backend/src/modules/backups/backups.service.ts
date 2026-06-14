import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { BackupStatus, BackupType } from '@prisma/client';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditLogService } from '../security/audit-log.service';

@Injectable()
export class BackupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditLogService,
  ) {}

  async list() {
    return this.prisma.backupJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  async run(type: BackupType, triggeredBy?: string | null) {
    const job = await this.prisma.backupJob.create({
      data: {
        type,
        status: BackupStatus.running,
        startedAt: new Date(),
        metadataJson: { triggeredBy: triggeredBy || 'system' },
      },
    });

    try {
      const location = await this.executeBackup(job.id, type);
      const checksum = await this.computeChecksum(location);
      const size = await this.getPathSize(location);

      const updated = await this.prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: BackupStatus.completed,
          location,
          size: BigInt(size),
          checksum,
          completedAt: new Date(),
        },
      });

      await this.audit.logAudit({
        actorId: triggeredBy || null,
        actorType: triggeredBy ? 'admin' as any : 'system' as any,
        action: 'backup.run',
        entityType: 'backup_job',
        entityId: updated.id,
        newValues: { type, location, checksum, size },
      });

      return updated;
    } catch (error: any) {
      await this.prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: BackupStatus.failed,
          completedAt: new Date(),
          metadataJson: {
            triggeredBy: triggeredBy || 'system',
            error: error.message,
          } as any,
        },
      });
      throw error;
    }
  }

  async restore(id: string, triggeredBy?: string | null) {
    const job = await this.prisma.backupJob.findUnique({ where: { id } });
    if (!job?.location) {
      throw new BadRequestException('Backup artifact not found');
    }

    await this.prisma.backupJob.update({
      where: { id },
      data: { status: BackupStatus.restoring },
    });

    if (job.type === BackupType.database) {
      throw new BadRequestException('Database restore requires an external restore command and is not enabled by default.');
    }

    if (job.type === BackupType.storage || job.type === BackupType.full_snapshot) {
      const sourceUploads = join(job.location, 'uploads');
      const targetUploads = resolve(process.cwd(), 'uploads');
      await mkdir(targetUploads, { recursive: true });
      await cp(sourceUploads, targetUploads, { recursive: true, force: true });
    }

    if (job.type === BackupType.configuration || job.type === BackupType.full_snapshot) {
      const source = join(job.location, 'config.snapshot.json');
      const target = resolve(process.cwd(), 'backups', 'restored-config.snapshot.json');
      await mkdir(resolve(process.cwd(), 'backups'), { recursive: true });
      const content = await readFile(source);
      await writeFile(target, content);
    }

    const restored = await this.prisma.backupJob.update({
      where: { id },
      data: {
        status: BackupStatus.restored,
        completedAt: new Date(),
      },
    });

    await this.audit.logAudit({
      actorId: triggeredBy || null,
      actorType: triggeredBy ? 'admin' as any : 'system' as any,
      action: 'backup.restore',
      entityType: 'backup_job',
      entityId: id,
      newValues: { location: job.location, type: job.type },
    });

    return restored;
  }

  private async executeBackup(id: string, type: BackupType) {
    const backupDir = resolve(process.cwd(), 'backups', `${new Date().toISOString().slice(0, 10)}-${id}`);
    await mkdir(backupDir, { recursive: true });

    if (type === BackupType.database || type === BackupType.full_snapshot) {
      await this.writeDatabaseManifest(join(backupDir, 'database.snapshot.json'));
    }

    if (type === BackupType.storage || type === BackupType.full_snapshot) {
      const uploadsDir = resolve(process.cwd(), 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      await cp(uploadsDir, join(backupDir, 'uploads'), { recursive: true, force: true });
    }

    if (type === BackupType.configuration || type === BackupType.full_snapshot) {
      const configSnapshot = {
        nodeEnv: this.config.get('NODE_ENV'),
        appUrl: this.config.get('APP_URL'),
        frontendUrl: this.config.get('FRONTEND_URL'),
        storageDriver: this.config.get('STORAGE_DRIVER'),
        backupCreatedAt: new Date().toISOString(),
      };
      await writeFile(join(backupDir, 'config.snapshot.json'), JSON.stringify(configSnapshot, null, 2), 'utf8');
    }

    return backupDir;
  }

  private async writeDatabaseManifest(filePath: string) {
    const [users, professors, scholarships, opportunities, applications, subscriptions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.professor.count(),
      this.prisma.scholarship.count(),
      this.prisma.opportunity.count(),
      this.prisma.application.count(),
      this.prisma.subscription.count(),
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      counts: {
        users,
        professors,
        scholarships,
        opportunities,
        applications,
        subscriptions,
      },
    };

    await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  }

  private async computeChecksum(location: string) {
    const hash = createHash('sha256');
    const files = await this.listFiles(location);
    for (const file of files.sort()) {
      const content = await readFile(file);
      hash.update(file);
      hash.update(content);
    }
    return hash.digest('hex');
  }

  private async listFiles(location: string): Promise<string[]> {
    const entry = await stat(location);
    if (entry.isFile()) return [location];

    const files: string[] = [];
    const children = await readdir(location, { withFileTypes: true });
    for (const child of children) {
      const childPath = join(location, child.name);
      if (child.isDirectory()) {
        files.push(...await this.listFiles(childPath));
      } else {
        files.push(childPath);
      }
    }
    return files;
  }

  private async getPathSize(location: string): Promise<number> {
    const entry = await stat(location);
    if (entry.isFile()) return entry.size;

    const children = await readdir(location, { withFileTypes: true });
    let total = 0;
    for (const child of children) {
      total += await this.getPathSize(join(location, child.name));
    }
    return total;
  }
}
