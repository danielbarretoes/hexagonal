import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('organization_invitations')
export class OrganizationInvitationTypeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  organizationId!: string;

  @Column()
  email!: string;

  @Column('uuid')
  roleId!: string;

  @Column()
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
