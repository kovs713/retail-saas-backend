import { ApiResponse } from './api-response.dto';

export class PaginationResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
