import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const keyHex = this.config.get<string>('ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef');
    this.key = Buffer.from(keyHex.padEnd(64, '0').slice(0, 64), 'hex');
    if (this.key.length !== 32) {
      // fallback: hash the key string to 32 bytes
      this.key = crypto.createHash('sha256').update(keyHex).digest();
    }
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':');
  }

  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) return encryptedText; // not encrypted
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  randomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}
