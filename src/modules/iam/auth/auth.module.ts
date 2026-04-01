/**
 * Auth Module
 * Internal module for authentication within IAM context.
 */

import { Module } from '@nestjs/common';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { UsersAccessModule } from '../users/users-access.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { AuthSupportModule } from './auth-support.module';
import { LogoutAllSessionsUseCase } from './application/use-cases/logout-all-sessions.use-case';
import { LogoutSessionUseCase } from './application/use-cases/logout-session.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { RequestEmailVerificationUseCase } from './application/use-cases/request-email-verification.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { AuditLogsAccessModule } from '../../observability/audit-logs/audit-logs-access.module';

@Module({
  imports: [UsersAccessModule, AuthSupportModule, AuditLogsAccessModule],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    LogoutSessionUseCase,
    LogoutAllSessionsUseCase,
    RefreshSessionUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    RequestEmailVerificationUseCase,
    VerifyEmailUseCase,
  ],
  exports: [
    LoginUseCase,
    LogoutSessionUseCase,
    LogoutAllSessionsUseCase,
    RefreshSessionUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    RequestEmailVerificationUseCase,
    VerifyEmailUseCase,
    AuthSupportModule,
  ],
})
export class AuthModule {}
