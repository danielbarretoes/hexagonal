/**
 * Member TypeORM Entity
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { UserTypeOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.entity';
import { RoleTypeOrmEntity } from '../../../../../roles/infrastructure/persistence/typeorm/entities/role.entity';
import { OrganizationTypeOrmEntity } from './organization.entity';

@Entity('members')
@Unique('uq_members_user_organization', ['userId', 'organizationId'])
@Index('idx_members_organization', ['organizationId'])
@Index('idx_members_user', ['userId'])
@Index('idx_members_role', ['roleId'])
export class MemberTypeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => UserTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserTypeOrmEntity;

  @Column('uuid')
  organizationId!: string;

  @ManyToOne(() => OrganizationTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationTypeOrmEntity;

  @Column('uuid')
  roleId!: string;

  @ManyToOne(() => RoleTypeOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role!: RoleTypeOrmEntity;

  @CreateDateColumn()
  joinedAt!: Date;
}
