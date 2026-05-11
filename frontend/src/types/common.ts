export type Pagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ApiErrorShape = {
  message?: string;
  error?: string;
  errors?: any;
};

