/**
 * Bcrypt password hasher adapter.
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class BcryptPasswordHasherAdapter implements PasswordHasherPort {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, PASSWORD_SALT_ROUNDS);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
