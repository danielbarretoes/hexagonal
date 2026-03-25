/**
 * Users Module
 * Internal module for user management within IAM context.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/user.entity';
import { UserTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/user.typeorm-repository';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { GetPaginatedUsersUseCase } from './application/use-cases/get-paginated-users.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { RestoreUserUseCase } from './application/use-cases/restore-user.use-case';
import { USER_REPOSITORY_TOKEN } from './application/ports/user-repository.token';
import { UsersController } from './presentation/controllers/users.controller';
import { AuthSupportModule } from '../auth/auth-support.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserTypeOrmEntity]), AuthSupportModule],
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY_TOKEN, useClass: UserTypeOrmRepository },
    UserTypeOrmRepository,
    RegisterUserUseCase,
    GetUserByIdUseCase,
    GetPaginatedUsersUseCase,
    DeleteUserUseCase,
    RestoreUserUseCase,
  ],
  exports: [
    USER_REPOSITORY_TOKEN,
    RegisterUserUseCase,
    GetUserByIdUseCase,
    GetPaginatedUsersUseCase,
    DeleteUserUseCase,
    RestoreUserUseCase,
  ],
})
export class UsersModule {}
