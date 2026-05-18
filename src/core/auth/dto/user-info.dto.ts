import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserInfoDto {
  @ApiProperty({ description: 'User ID', example: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'User role', example: 'owner' })
  @Expose()
  role: string;

  @ApiProperty({ description: 'Shop ID', example: 'uuid' })
  @Expose()
  shopId: string;

  @ApiPropertyOptional({
    description: 'Evotor user ID',
    example: '01-000000000000001',
  })
  @Expose()
  evotorUserId: string | null;

  @ApiProperty({ description: 'User active status', example: true })
  @Expose()
  isActive: boolean;
}
