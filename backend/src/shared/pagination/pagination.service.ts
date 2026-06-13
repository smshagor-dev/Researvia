import { Injectable } from '@nestjs/common';

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

@Injectable()
export class PaginationService {
  paginate<T>(data: T[], total: number, page: number, perPage: number): PaginatedResult<T> {
    const lastPage = Math.ceil(total / perPage) || 1;
    return {
      data,
      meta: {
        page,
        perPage,
        total,
        lastPage,
        hasNextPage: page < lastPage,
        hasPrevPage: page > 1,
      },
    };
  }

  getSkip(page: number, perPage: number): number {
    return (page - 1) * perPage;
  }

  clampPerPage(perPage: number, max = 50): number {
    return Math.min(Math.max(1, perPage), max);
  }

  clampPage(page: number): number {
    return Math.max(1, page);
  }
}
