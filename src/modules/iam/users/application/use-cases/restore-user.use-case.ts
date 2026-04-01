/**
 * Restore User Use Case
 * Re-activates a previously soft-deleted identity.
 */

import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import { UserNotFoundException } from '../../../shared/domain/exceptions';
import { TenantUserManagementPolicy } from '../policies/tenant-user-management.policy';

@Injectable()
export class RestoreUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    private readonly tenantUserManagementPolicy: TenantUserManagementPolicy,
  ) {}

  async execute(actorUserId: string, organizationId: string, id: string): Promise<User> {
    await this.tenantUserManagementPolicy.assertCanManageTargetUser(
      actorUserId,
      id,
      organizationId,
    );

    const user = await this.userRepository.findById(id, { includeDeleted: true });

    if (!user) {
      throw new UserNotFoundException(id);
    }

    if (!user.isDeleted) {
      return user;
    }

    return this.userRepository.restore(id);
  }
}
