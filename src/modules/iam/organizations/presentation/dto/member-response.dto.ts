import { ApiProperty } from '@nestjs/swagger';

export class MemberResponseDto {
  @ApiProperty({
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    format: 'uuid',
  })
  userId!: string;

  @ApiProperty({
    format: 'uuid',
  })
  organizationId!: string;

  @ApiProperty({
    example: 'member',
  })
  role!: string;

  @ApiProperty({
    type: [String],
  })
  permissions!: string[];

  @ApiProperty()
  joinedAt!: Date;
}
