/**
 * Auth Support Module
 * Exposes technical authentication services that can be reused by other IAM features
 * without coupling them to login-specific application flows.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JWT_CONFIG } from '../../../config/auth/jwt.config';
import { JWT_TOKEN_PORT } from './application/ports/jwt-token.token';
import { PASSWORD_HASHER_PORT } from './application/ports/password-hasher.token';
import { JwtTokenAdapter } from './infrastructure/adapters/jwt-token.adapter';
import { BcryptPasswordHasherAdapter } from './infrastructure/adapters/bcrypt-password-hasher.adapter';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
  ],
  providers: [
    { provide: JWT_TOKEN_PORT, useClass: JwtTokenAdapter },
    { provide: PASSWORD_HASHER_PORT, useClass: BcryptPasswordHasherAdapter },
    JwtTokenAdapter,
    BcryptPasswordHasherAdapter,
    JwtAuthGuard,
  ],
  exports: [JWT_TOKEN_PORT, PASSWORD_HASHER_PORT, JwtAuthGuard],
})
export class AuthSupportModule {}
