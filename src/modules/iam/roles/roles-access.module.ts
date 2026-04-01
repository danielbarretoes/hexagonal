import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ROLE_REPOSITORY_TOKEN } from './application/ports/role-repository.token';
import { PermissionTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/permission.entity';
import { RoleTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/role.entity';
import { RoleTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/role.typeorm-repository';

@Module({
  imports: [TypeOrmModule.forFeature([RoleTypeOrmEntity, PermissionTypeOrmEntity])],
  providers: [
    { provide: ROLE_REPOSITORY_TOKEN, useClass: RoleTypeOrmRepository },
    RoleTypeOrmRepository,
  ],
  exports: [ROLE_REPOSITORY_TOKEN],
})
export class RolesAccessModule {}
