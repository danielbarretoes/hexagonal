import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import { UserNotFoundException } from '../../../shared/domain/exceptions';
import { TenantUserManagementPolicy } from '../policies/tenant-user-management.policy';

export interface UpdateUserProfileInOrganizationCommand {
  actorUserId: string;
  organizationId: string;
  targetUserId: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class UpdateUserProfileInOrganizationUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    private readonly tenantUserManagementPolicy: TenantUserManagementPolicy,
  ) {}

  async execute(command: UpdateUserProfileInOrganizationCommand): Promise<User> {
    await this.tenantUserManagementPolicy.assertCanManageTargetUser(
      command.actorUserId,
      command.targetUserId,
      command.organizationId,
    );

    const user = await this.userRepository.findById(command.targetUserId, {
      includeDeleted: true,
    });

    if (!user) {
      throw new UserNotFoundException(command.targetUserId);
    }

    const updatedUser = user.updateProfile(command.firstName, command.lastName);
    return this.userRepository.update(command.targetUserId, updatedUser);
  }
}
