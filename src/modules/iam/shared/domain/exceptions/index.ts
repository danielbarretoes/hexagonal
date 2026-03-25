/**
 * IAM shared domain exceptions.
 * These business exceptions are reused by multiple IAM features and therefore
 * live in the bounded context shared kernel instead of a fake top-level domain folder.
 */

import { DomainException } from '../../../../../shared/domain/exceptions/domain.exception';

export class UserAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super(`User with email ${email} already exists`, 'USER_ALREADY_EXISTS');
  }
}

export class UserNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`, 'USER_NOT_FOUND');
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

export class OrganizationAlreadyExistsException extends DomainException {
  constructor(name: string) {
    super(`Organization with name ${name} already exists`, 'ORGANIZATION_ALREADY_EXISTS');
  }
}

export class InvalidOrganizationNameException extends DomainException {
  constructor() {
    super('Organization name must be between 2 and 100 characters', 'INVALID_ORGANIZATION_NAME');
  }
}

export class OrganizationNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`Organization not found: ${identifier}`, 'ORGANIZATION_NOT_FOUND');
  }
}

export class MemberNotFoundException extends DomainException {
  constructor(userId: string, organizationId: string) {
    super(
      `Member not found for user ${userId} in organization ${organizationId}`,
      'MEMBER_NOT_FOUND',
    );
  }
}

export class MemberByIdNotFoundException extends DomainException {
  constructor(memberId: string) {
    super(`Member not found: ${memberId}`, 'MEMBER_NOT_FOUND');
  }
}

export class InvalidMembershipRoleException extends DomainException {
  constructor(role: string) {
    super(`Invalid membership role: ${role}`, 'INVALID_MEMBERSHIP_ROLE');
  }
}

export class RoleNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`Role not found: ${identifier}`, 'ROLE_NOT_FOUND');
  }
}
