/**
 * Generic standard success response envelope.
 *
 * All API endpoints return data wrapped in this shape to guarantee a predictable,
 * machine-parseable top-level structure for clients.
 */
export class ApiResponseDto<T> {
  /** Always `true` on a successful response. */
  readonly success = true as const;

  /** The actual response payload. */
  readonly data: T;

  /** Response-level metadata (correlation ID, pagination info, etc.). */
  readonly meta: Record<string, unknown>;

  /** Always `null` on a successful response. */
  readonly error = null;

  constructor(data: T, meta: Record<string, unknown> = {}) {
    this.data = data;
    this.meta = meta;
  }

  /**
   * Static factory for ergonomic construction.
   */
  static of<T>(data: T, meta: Record<string, unknown> = {}): ApiResponseDto<T> {
    return new ApiResponseDto<T>(data, meta);
  }
}

/** Shape of a single page of items returned in a paginated response. */
export interface PaginationMeta {
  /** Current page number (1-based). */
  page: number;

  /** Maximum number of items per page. */
  limit: number;

  /** Total number of matching records across all pages. */
  total: number;

  /** Total number of pages. */
  totalPages: number;

  /** Whether a next page exists. */
  hasNextPage: boolean;

  /** Whether a previous page exists. */
  hasPrevPage: boolean;
}

/**
 * Paginated variant of ApiResponseDto.
 *
 * Extends `ApiResponseDto` by embedding standard pagination metadata so clients
 * can render paginators without any additional round-trips.
 */
export class PaginatedResponseDto<T> extends ApiResponseDto<T[]> {
  declare readonly meta: PaginationMeta & Record<string, unknown>;

  constructor(
    items: T[],
    paginationMeta: PaginationMeta,
    additionalMeta: Record<string, unknown> = {}
  ) {
    super(items, { ...paginationMeta, ...additionalMeta });
  }

  /**
   * Static factory accepting raw pagination inputs and computing derived fields.
   */
  static paginate<T>(
    items: T[],
    opts: { page: number; limit: number; total: number },
    additionalMeta: Record<string, unknown> = {}
  ): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(opts.total / opts.limit) || 1;
    const paginationMeta: PaginationMeta = {
      page: opts.page,
      limit: opts.limit,
      total: opts.total,
      totalPages,
      hasNextPage: opts.page < totalPages,
      hasPrevPage: opts.page > 1,
    };
    return new PaginatedResponseDto<T>(items, paginationMeta, additionalMeta);
  }
}
