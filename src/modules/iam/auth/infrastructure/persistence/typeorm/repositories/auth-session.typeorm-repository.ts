import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuthSession } from '../../../../domain/entities/auth-session.entity';
import type { AuthSessionRepositoryPort } from '../../../../domain/ports/auth-session.repository.port';
import { AuthSessionTypeOrmEntity } from '../entities/auth-session.entity';

@Injectable()
export class AuthSessionTypeOrmRepository implements AuthSessionRepositoryPort {
  constructor(
    @InjectRepository(AuthSessionTypeOrmEntity)
    private readonly repository: Repository<AuthSessionTypeOrmEntity>,
  ) {}

  async findById(id: string): Promise<AuthSession | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findActiveByUserId(userId: string): Promise<AuthSession | null> {
    const entity = await this.repository.findOne({
      where: {
        userId,
        revokedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async create(session: AuthSession): Promise<AuthSession> {
    const entity = this.repository.create({
      id: session.id,
      userId: session.userId,
      refreshTokenHash: session.refreshTokenHash,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(session: AuthSession): Promise<AuthSession> {
    await this.repository.update(session.id, {
      refreshTokenHash: session.refreshTokenHash,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      updatedAt: session.updatedAt,
    });

    const entity = await this.repository.findOne({ where: { id: session.id } });
    return this.toDomain(entity as AuthSessionTypeOrmEntity);
  }

  async revokeAllActiveByUserId(userId: string): Promise<void> {
    const now = new Date();

    await this.repository.update(
      {
        userId,
        revokedAt: IsNull(),
      },
      {
        revokedAt: now,
        updatedAt: now,
      },
    );
  }

  private toDomain(entity: AuthSessionTypeOrmEntity): AuthSession {
    return AuthSession.rehydrate({
      id: entity.id,
      userId: entity.userId,
      refreshTokenHash: entity.refreshTokenHash,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
