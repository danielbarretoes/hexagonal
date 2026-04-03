import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessAuthGuard } from '../../../auth/presentation/guards/access-auth.guard';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../../common/http/guards/permission.guard';
import { RequirePermissions } from '../../../../../common/http/decorators/require-permissions.decorator';
import { PERMISSION_CODES } from '../../../../../shared/domain/authorization/permission-codes';
import { CurrentOrganizationId } from '../../../../../common/http/decorators/current-organization-id.decorator';
import { CreateOrganizationInvitationUseCase } from '../../application/use-cases/create-organization-invitation.use-case';
import { AcceptOrganizationInvitationUseCase } from '../../application/use-cases/accept-organization-invitation.use-case';
import { CreateOrganizationInvitationDto } from '../dto/create-organization-invitation.dto';
import { OrganizationInvitationResponseDto } from '../dto/organization-invitation-response.dto';
import { AcceptOrganizationInvitationDto } from '../dto/accept-organization-invitation.dto';
import { CurrentUser } from '../../../../../common/http/decorators/current-user.decorator';
import { Idempotent } from '../../../../../common/http/decorators/idempotent.decorator';
import { TenantScoped } from '../../../../../common/http/decorators/tenant-scoped.decorator';
import type { AuthenticatedUserPayload } from '../../../../../common/http/authenticated-request';
import {
  AUTH_RUNTIME_OPTIONS,
  type AuthRuntimeOptions,
} from '../../../auth/application/ports/auth-runtime-options.token';

@ApiTags('Organization Invitations')
@Controller({ path: 'organization-invitations', version: '1' })
export class OrganizationInvitationsController {
  constructor(
    private readonly createOrganizationInvitationUseCase: CreateOrganizationInvitationUseCase,
    private readonly acceptOrganizationInvitationUseCase: AcceptOrganizationInvitationUseCase,
    @Inject(AUTH_RUNTIME_OPTIONS)
    private readonly authRuntimeOptions: AuthRuntimeOptions,
  ) {}

  @Post()
  @Idempotent()
  @TenantScoped()
  @UseGuards(AccessAuthGuard, PermissionGuard)
  @RequirePermissions(PERMISSION_CODES.IAM_MEMBERS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Invite a user email into the current organization' })
  @ApiCreatedResponse({ type: OrganizationInvitationResponseDto })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() body: CreateOrganizationInvitationDto,
  ) {
    const response = await this.createOrganizationInvitationUseCase.execute({
      actorUserId: user.userId,
      organizationId,
      email: body.email,
      roleCode: body.roleCode,
    });

    return this.authRuntimeOptions.exposePrivateTokens ? response : {};
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Accept an organization invitation as the authenticated user' })
  @ApiNoContentResponse()
  async accept(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() body: AcceptOrganizationInvitationDto,
  ): Promise<void> {
    await this.acceptOrganizationInvitationUseCase.execute(body.token, user.userId);
  }
}
