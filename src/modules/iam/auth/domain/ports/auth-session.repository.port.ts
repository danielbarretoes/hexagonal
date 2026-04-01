import { AuthSession } from '../entities/auth-session.entity';

export interface AuthSessionRepositoryPort {
  findById(id: string): Promise<AuthSession | null>;
  findActiveByUserId(userId: string): Promise<AuthSession | null>;
  create(session: AuthSession): Promise<AuthSession>;
  update(session: AuthSession): Promise<AuthSession>;
  revokeAllActiveByUserId(userId: string): Promise<void>;
}
