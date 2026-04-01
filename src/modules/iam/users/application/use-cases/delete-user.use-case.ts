/**
 * Delete User Use Case
 * Performs a soft delete so identities remain auditable.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import { UserNotFoundException } from '../../../shared/domain/exceptions';
import { TenantUserManagementPolicy } from '../policies/tenant-user-management.policy';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    private readonly tenantUserManagementPolicy: TenantUserManagementPolicy,
  ) {}

  async execute(actorUserId: string, organizationId: string, id: string): Promise<void> {
    await this.tenantUserManagementPolicy.assertCanManageTargetUser(
      actorUserId,
      id,
      organizationId,
    );

    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new UserNotFoundException(id);
    }

    await this.userRepository.delete(id);
  }
}
