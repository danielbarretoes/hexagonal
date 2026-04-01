import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  UserActionToken,
  type UserActionTokenPurpose,
} from '../../../../domain/entities/user-action-token.entity';
import type { UserActionTokenRepositoryPort } from '../../../../domain/ports/user-action-token.repository.port';
import { UserActionTokenTypeOrmEntity } from '../entities/user-action-token.entity';

@Injectable()
export class UserActionTokenTypeOrmRepository implements UserActionTokenRepositoryPort {
  constructor(
    @InjectRepository(UserActionTokenTypeOrmEntity)
    private readonly repository: Repository<UserActionTokenTypeOrmEntity>,
  ) {}

  async findById(id: string): Promise<UserActionToken | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findActiveByUserIdAndPurpose(
    userId: string,
    purpose: UserActionTokenPurpose,
  ): Promise<UserActionToken | null> {
    const entity = await this.repository.findOne({
      where: {
        userId,
        purpose,
        consumedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async create(token: UserActionToken): Promise<UserActionToken> {
    const entity = this.repository.create({
      id: token.id,
      userId: token.userId,
      purpose: token.purpose,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      consumedAt: token.consumedAt,
      createdAt: token.createdAt,
    });

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(token: UserActionToken): Promise<UserActionToken> {
    await this.repository.update(token.id, {
      consumedAt: token.consumedAt,
      expiresAt: token.expiresAt,
      tokenHash: token.tokenHash,
    });

    const entity = await this.repository.findOne({ where: { id: token.id } });
    return this.toDomain(entity as UserActionTokenTypeOrmEntity);
  }

  private toDomain(entity: UserActionTokenTypeOrmEntity): UserActionToken {
    return UserActionToken.rehydrate({
      id: entity.id,
      userId: entity.userId,
      purpose: entity.purpose,
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      consumedAt: entity.consumedAt,
      createdAt: entity.createdAt,
    });
  }
}
