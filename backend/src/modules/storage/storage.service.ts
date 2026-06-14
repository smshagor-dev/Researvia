import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3?: S3Client;
  private bucket: string;
  private readonly driver: 'local' | 's3' | 'r2';
  private readonly useLocalFallback: boolean;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID');
    this.driver = (this.config.get<string>('STORAGE_DRIVER', 'local') as 'local' | 's3' | 'r2');

    this.bucket = this.config.get<string>('S3_BUCKET', 'profcrm');
    this.useLocalFallback = this.driver === 'local' || (!endpoint && !accessKeyId);

    if (!this.useLocalFallback) {
      this.s3 = new S3Client({
        endpoint,
        region: this.config.get<string>('S3_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: accessKeyId || '',
          secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY', ''),
        },
        forcePathStyle: !!endpoint, // needed for R2/MinIO
      });
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    if (this.useLocalFallback) {
      const fullPath = join(process.cwd(), 'uploads', key);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, body);
      this.logger.debug(`[LocalStorage] Saved upload: ${fullPath} (${contentType})`);
      return `${this.config.get('APP_URL', 'http://localhost:3001')}/uploads/${key}`;
    }

    await this.s3!.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));

    const endpoint = this.config.get<string>('S3_ENDPOINT');
    if (endpoint) {
      return `${endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.useLocalFallback) {
      return `${this.config.get('APP_URL', 'http://localhost:3001')}/uploads/${key}`;
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3!, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    if (this.useLocalFallback) return;
    await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    if (this.useLocalFallback) return false;
    try {
      await this.s3!.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck() {
    if (this.useLocalFallback) {
      return { status: 'healthy', driver: 'local' };
    }

    try {
      await this.s3!.send(new HeadObjectCommand({ Bucket: this.bucket, Key: '__healthcheck__' }));
    } catch (error: any) {
      if (error?.$metadata?.httpStatusCode && error.$metadata.httpStatusCode < 500) {
        return { status: 'healthy', driver: this.driver };
      }
      return { status: 'degraded', driver: this.driver, message: error.message };
    }

    return { status: 'healthy', driver: this.driver };
  }
}
