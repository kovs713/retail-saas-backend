import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'Product ID' })
  @Expose()
  productId: string;

  @ApiProperty({ description: 'Product SKU' })
  @Expose()
  sku?: string;

  @ApiProperty({ description: 'Product name' })
  @Expose()
  name?: string;

  @ApiProperty({ description: 'Quantity' })
  @Expose()
  quantity: number;

  @ApiProperty({ description: 'Price' })
  @Expose()
  price: number;
}

export class OrderResponseDto {
  @ApiProperty({ description: 'Order ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Shop ID' })
  @Expose()
  shopId: string;

  @ApiProperty({ description: 'Customer name' })
  @Expose()
  customerName: string;

  @ApiProperty({ description: 'Customer phone' })
  @Expose()
  customerPhone: string;

  @ApiProperty({ description: 'Order items', type: [OrderItemResponseDto] })
  @Expose()
  @Type(() => OrderItemResponseDto)
  items: OrderItemResponseDto[];

  @ApiProperty({ description: 'Total amount' })
  @Expose()
  @Transform(({ value }) => Number(value))
  totalAmount: number;

  @ApiProperty({ description: 'Order status', enum: ['PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED'] })
  @Expose()
  status: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @Expose()
  notes?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return undefined;
  })
  createdAt: string;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return undefined;
  })
  updatedAt: string;
}

export class OrderListResponseDto {
  @ApiProperty({ description: 'Orders list', type: [OrderResponseDto] })
  @Expose()
  @Type(() => OrderResponseDto)
  data: OrderResponseDto[];

  @ApiProperty({ description: 'Total count' })
  @Expose()
  total: number;

  @ApiProperty({ description: 'Page number' })
  @Expose()
  page: number;

  @ApiProperty({ description: 'Items per page' })
  @Expose()
  limit: number;
}
