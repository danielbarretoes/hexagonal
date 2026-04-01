import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleTypeOrmEntity } from './role.entity';

@Entity('permissions')
@Index('uq_permissions_code', ['code'], { unique: true })
export class PermissionTypeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ManyToMany(() => RoleTypeOrmEntity, (role) => role.permissions)
  roles!: RoleTypeOrmEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
