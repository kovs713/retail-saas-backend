import { User } from '@/modules/user/entities';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUserDto {
  @ApiProperty({ description: 'User ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'User role', example: 'owner' })
  role: string;

  @ApiProperty({ description: 'Is user active', example: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Shop ID', example: 'uuid' })
  shopId: string | null;

  @ApiPropertyOptional({ description: 'Evotor user ID', example: '123' })
  evotorUserId: string | null;

  @ApiPropertyOptional({
    description: 'Shop name',
    example: 'My Shop',
  })
  shopName: string | null;

  @ApiProperty({ description: 'Created at', example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at', example: '2024-01-01T00:00:00Z' })
  updatedAt: Date;

  static fromEntity(user: User): AdminUserDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      shopId: user.shopId,
      evotorUserId: user.evotorUserId,
      shopName: user.shop?.name ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
