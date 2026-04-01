import { ApiProperty } from '@nestjs/swagger';

export class OrganizationInvitationResponseDto {
  @ApiProperty()
  invitationToken!: string;
}
