import { ApiResponse } from './api-response.dto';

export class PaginationApiResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
