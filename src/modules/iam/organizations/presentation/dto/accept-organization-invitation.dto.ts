import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AcceptOrganizationInvitationDto {
  @ApiProperty()
  @IsString()
  token!: string;
}
