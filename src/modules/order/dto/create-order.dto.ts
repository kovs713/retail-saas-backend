import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity', example: 1 })
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Price at time of order' })
  price: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Customer name', example: 'Иван Иванов' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ description: 'Customer phone', example: '+7 999 123 4567' })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiProperty({ description: 'Order items', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  items: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
