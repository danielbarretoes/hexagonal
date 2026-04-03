import { Inject, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ApiKeySecretHasherPort } from '../../domain/ports/api-key-secret-hasher.port';
import {
  API_KEYS_RUNTIME_OPTIONS,
  type ApiKeysRuntimeOptions,
} from '../../application/ports/api-keys-runtime-options.token';

@Injectable()
export class HmacApiKeySecretHasherAdapter implements ApiKeySecretHasherPort {
  constructor(
    @Inject(API_KEYS_RUNTIME_OPTIONS)
    private readonly apiKeysRuntimeOptions: ApiKeysRuntimeOptions,
  ) {}

  hash(secret: string): string {
    return createHmac('sha256', this.apiKeysRuntimeOptions.secret).update(secret).digest('hex');
  }

  verify(secret: string, secretHash: string): boolean {
    const expectedHash = Buffer.from(this.hash(secret), 'utf8');
    const receivedHash = Buffer.from(secretHash, 'utf8');

    if (expectedHash.length !== receivedHash.length) {
      return false;
    }

    return timingSafeEqual(expectedHash, receivedHash);
  }
}
