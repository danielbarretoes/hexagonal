/**
 * Users access module.
 * Exposes user persistence providers without exporting the full users feature module.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_REPOSITORY_TOKEN } from './application/ports/user-repository.token';
import { UserTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/user.typeorm-repository';
import { UserTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserTypeOrmEntity])],
  providers: [
    { provide: USER_REPOSITORY_TOKEN, useClass: UserTypeOrmRepository },
    UserTypeOrmRepository,
  ],
  exports: [USER_REPOSITORY_TOKEN],
})
export class UsersAccessModule {}
