/**
 * User Repository Port
 * Defines the interface for user persistence.
 */

import { User, CreateUserProps } from '../entities/user.entity';
import { Paginated } from '../../../../../shared/domain/primitives/paginated';

export interface UserQueryOptions {
  includeDeleted?: boolean;
}

export interface UserRepositoryPort {
  findById(id: string, options?: UserQueryOptions): Promise<User | null>;
  findByEmail(email: string, options?: UserQueryOptions): Promise<User | null>;
  findPaginated(page: number, limit: number): Promise<Paginated<User>>;
  create(props: CreateUserProps & { id: string }): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<User>;
}
