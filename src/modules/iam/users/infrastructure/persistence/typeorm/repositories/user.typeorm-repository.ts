/**
 * User TypeORM Repository
 * Implements UserRepositoryPort using TypeORM.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserTypeOrmEntity } from '../entities/user.entity';
import {
  UserQueryOptions,
  UserRepositoryPort,
} from '../../../../domain/ports/user.repository.port';
import { UserMapper } from '../mappers/user.mapper';
import type { User, CreateUserProps } from '../../../../domain/entities/user.entity';
import { Paginated } from '../../../../../../../shared/domain/primitives/paginated';
import { UserNotFoundException } from '../../../../../shared/domain/exceptions';

@Injectable()
export class UserTypeOrmRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly repository: Repository<UserTypeOrmEntity>,
  ) {}

  async findById(id: string, options?: UserQueryOptions): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { id },
      withDeleted: options?.includeDeleted ?? false,
    });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findManyByIds(ids: readonly string[], options?: UserQueryOptions): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }

    const entities = await this.repository.find({
      where: { id: In([...ids]) },
      withDeleted: options?.includeDeleted ?? false,
    });
    const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));

    return ids
      .map((id) => entitiesById.get(id))
      .filter((entity): entity is UserTypeOrmEntity => Boolean(entity))
      .map(UserMapper.toDomain);
  }

  async findByEmail(email: string, options?: UserQueryOptions): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { email: email.toLowerCase().trim() },
      withDeleted: options?.includeDeleted ?? false,
    });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findPaginated(page: number, limit: number): Promise<Paginated<User>> {
    const skip = (page - 1) * limit;
    const [entities, total] = await this.repository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return Paginated.create(entities.map(UserMapper.toDomain), total, page, limit);
  }

  async create(props: CreateUserProps & { id: string }): Promise<User> {
    const entity = this.repository.create({
      id: props.id,
      email: props.email,
      passwordHash: props.passwordHash,
      firstName: props.firstName,
      lastName: props.lastName,
      emailVerifiedAt: props.emailVerifiedAt ?? null,
    });
    const saved = await this.repository.save(entity);
    return UserMapper.toDomain(saved);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const updateData: Partial<UserTypeOrmEntity> = {};
    if (data.email) updateData.email = data.email;
    if (data.passwordHash) updateData.passwordHash = data.passwordHash;
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.emailVerifiedAt !== undefined) updateData.emailVerifiedAt = data.emailVerifiedAt;
    if (data.deletedAt !== undefined) updateData.deletedAt = data.deletedAt;

    await this.repository.update(id, updateData);
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new UserNotFoundException(id);
    }

    return UserMapper.toDomain(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<User> {
    await this.repository.restore(id);
    const entity = await this.repository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!entity) {
      throw new UserNotFoundException(id);
    }

    return UserMapper.toDomain(entity);
  }
}
