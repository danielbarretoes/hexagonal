import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import {
  DEFAULT_ROLE_CODES,
  type DefaultRoleCode,
} from '../../../shared/domain/authorization/default-role-codes';
import { ROLE_REPOSITORY_TOKEN } from '../../../roles/application/ports/role-repository.token';
import type { RoleRepositoryPort } from '../../../roles/domain/ports/role.repository.port';
import type { MemberRepositoryPort } from '../../../organizations/domain/ports/member.repository.port';
import { MEMBER_REPOSITORY_TOKEN } from '../../../organizations/application/ports/member-repository.token';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { CreateUserProps, User } from '../../domain/entities/user.entity';
import {
  RoleNotFoundException,
  UserAlreadyExistsException,
} from '../../../shared/domain/exceptions';

export interface CreateUserInOrganizationCommand {
  organizationId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleCode?: DefaultRoleCode;
}

@Injectable()
export class CreateUserInOrganizationUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roleRepository: RoleRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: CreateUserInOrganizationCommand): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(command.email, {
      includeDeleted: true,
    });

    if (existingUser) {
      throw new UserAlreadyExistsException(command.email);
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const props: CreateUserProps & { id: string } = {
      id: crypto.randomUUID(),
      email: command.email,
      passwordHash,
      firstName: command.firstName,
      lastName: command.lastName,
    };
    const user = await this.userRepository.create(props);
    const roleCode = command.roleCode ?? DEFAULT_ROLE_CODES[3];
    const role = await this.roleRepository.findByCode(roleCode);

    if (!role) {
      throw new RoleNotFoundException(roleCode);
    }

    await this.memberRepository.create({
      userId: user.id,
      organizationId: command.organizationId,
      roleId: role.id,
    });

    return user;
  }
}
