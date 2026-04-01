import { UserActionToken, type UserActionTokenPurpose } from '../entities/user-action-token.entity';

export interface UserActionTokenRepositoryPort {
  findById(id: string): Promise<UserActionToken | null>;
  findActiveByUserIdAndPurpose(
    userId: string,
    purpose: UserActionTokenPurpose,
  ): Promise<UserActionToken | null>;
  create(token: UserActionToken): Promise<UserActionToken>;
  update(token: UserActionToken): Promise<UserActionToken>;
}
