import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    example: 'member',
    required: false,
  })
  @IsOptional()
  @IsString()
  roleCode?: string;
}
