import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetResponseDto {
  @ApiProperty({
    required: false,
    nullable: true,
  })
  resetToken?: string;
}
