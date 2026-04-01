import { Role } from '../entities/role.entity';

export interface RoleRepositoryPort {
  findById(id: string): Promise<Role | null>;
  findByCode(code: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
}
