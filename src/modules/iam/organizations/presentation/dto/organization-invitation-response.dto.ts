import { ApiProperty } from '@nestjs/swagger';

export class OrganizationInvitationResponseDto {
  @ApiProperty({
    required: false,
    nullable: true,
  })
  invitationToken?: string;
}
