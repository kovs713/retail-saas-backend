import { ApiProperty } from '@nestjs/swagger';

export class RegisterApplicationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  shopName: string;

  @ApiProperty()
  shopSlug: string;

  @ApiProperty({ example: 'pending' })
  status: string;
}
