import { ApiProperty } from '@nestjs/swagger';

export class RequestEmailVerificationResponseDto {
  @ApiProperty({
    required: false,
    nullable: true,
  })
  verificationToken?: string;
}
