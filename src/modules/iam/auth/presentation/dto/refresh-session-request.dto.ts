import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshSessionRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
