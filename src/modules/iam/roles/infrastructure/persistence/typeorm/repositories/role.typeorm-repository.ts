import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RoleRepositoryPort } from '../../../../domain/ports/role.repository.port';
import { Role } from '../../../../domain/entities/role.entity';
import { RoleTypeOrmEntity } from '../entities/role.entity';
import { RoleMapper } from '../mappers/role.mapper';

@Injectable()
export class RoleTypeOrmRepository implements RoleRepositoryPort {
  constructor(
    @InjectRepository(RoleTypeOrmEntity)
    private readonly repository: Repository<RoleTypeOrmEntity>,
  ) {}

  async findById(id: string): Promise<Role | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: {
        permissions: true,
      },
    });
    return entity ? RoleMapper.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<Role | null> {
    const entity = await this.repository.findOne({
      where: { code },
      relations: {
        permissions: true,
      },
    });
    return entity ? RoleMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Role[]> {
    const entities = await this.repository.find({
      relations: {
        permissions: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
    return entities.map((entity) => RoleMapper.toDomain(entity));
  }
}
