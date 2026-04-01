import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({
    example: 'admin',
  })
  @IsString()
  roleCode!: string;
}
