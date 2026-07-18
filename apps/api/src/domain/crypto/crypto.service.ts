import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { apiEnv } from '../../env';

@Injectable()
export class CryptoService {
  private readonly key = createHash('sha256').update(apiEnv.ENCRYPTION_MASTER_KEY).digest();

  hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  randomToken(size = 32) {
    return randomBytes(size).toString('hex');
  }

  timingSafeHashCompare(leftHash: string, rightHash: string) {
    const left = Buffer.from(leftHash);
    const right = Buffer.from(rightHash);
    if (left.length !== right.length) {
      return false;
    }
    return timingSafeEqual(left, right);
  }

  encryptJson<T extends Record<string, unknown>>(payload: T) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encoded = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      cipherText: encoded.toString('base64'),
      iv: iv.toString('base64'),
      authTag: tag.toString('base64'),
      keyVersion: 'v1',
    };
  }

  decryptJson<T>(payload: { cipherText: string; iv: string; authTag: string }): T {
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    const decoded = Buffer.concat([
      decipher.update(Buffer.from(payload.cipherText, 'base64')),
      decipher.final(),
    ]).toString('utf8');

    return JSON.parse(decoded) as T;
  }
}
