import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationInvitationDto {
  @ApiProperty({
    example: 'new-member@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'member',
    required: false,
  })
  @IsOptional()
  @IsString()
  roleCode?: string;
}
