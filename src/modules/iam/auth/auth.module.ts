/**
 * Auth Module
 * Internal module for authentication within IAM context.
 */

import { Module } from '@nestjs/common';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { AuthSupportModule } from './auth-support.module';

@Module({
  imports: [UsersModule, AuthSupportModule],
  controllers: [AuthController],
  providers: [LoginUseCase],
  exports: [LoginUseCase, AuthSupportModule],
})
export class AuthModule {}
