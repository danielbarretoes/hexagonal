import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { UserActionTokenPurpose } from '../../../../domain/entities/user-action-token.entity';

@Entity('user_action_tokens')
export class UserActionTokenTypeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  purpose!: UserActionTokenPurpose;

  @Column()
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
