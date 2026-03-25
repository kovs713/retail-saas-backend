import { ApiResponse } from './api-response.dto';

import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationResponse<T> extends ApiResponse<T[]> {
  @ApiPropertyOptional({
    description: 'Pagination metadata',
    type: 'object',
    properties: {
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      total: { type: 'number', example: 100 },
      totalPages: { type: 'number', example: 10 },
    },
  })
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
