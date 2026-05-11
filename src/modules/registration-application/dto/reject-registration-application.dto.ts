import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectRegistrationApplicationDto {
  @ApiPropertyOptional({ example: 'Incomplete business info' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
