export interface Pagination {
  limit: number;
  page: number;
}

export interface PaginationResponse<T> {
  currentPage: number;
  data: Array<T>;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalItems: number;
  totalPages: number;
}
