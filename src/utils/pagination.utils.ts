/**
 * Shared Pagination Utilities
 *
 * Centralized helpers for parsing, validating, and building
 * paginated responses across all list endpoints.
 *
 * @module utils/pagination.utils
 */

// ===========================================
// CONSTANTS
// ===========================================

export const PAGINATION_DEFAULTS = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 500,
    MIN_LIMIT: 1,
} as const;

// ===========================================
// INTERFACES
// ===========================================

export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

export interface PaginationMeta {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: PaginationMeta;
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Parse and validate pagination parameters from request query.
 * Accepts both `limit` and `perPage` as the page-size parameter.
 *
 * @param query - Express req.query object
 * @param defaults - Optional overrides for default page / limit
 * @returns Validated { page, limit, skip }
 */
export function parsePaginationParams(
    query: Record<string, any>,
    defaults?: { page?: number; limit?: number },
): PaginationParams {
    const defaultPage = defaults?.page ?? PAGINATION_DEFAULTS.DEFAULT_PAGE;
    const defaultLimit = defaults?.limit ?? PAGINATION_DEFAULTS.DEFAULT_LIMIT;

    const page = Math.max(
        parseInt(query.page as string, 10) || defaultPage,
        1,
    );

    const rawLimit =
        parseInt(query.limit as string, 10) ||
        parseInt(query.perPage as string, 10) ||
        defaultLimit;

    const limit = Math.min(
        Math.max(rawLimit, PAGINATION_DEFAULTS.MIN_LIMIT),
        PAGINATION_DEFAULTS.MAX_LIMIT,
    );

    const skip = (page - 1) * limit;

    return { page, limit, skip };
}

/**
 * Build a standardised pagination metadata object.
 *
 * @param total  - Total number of records matching the query
 * @param page   - Current page (1-based)
 * @param limit  - Items per page
 */
export function buildPaginationMeta(
    total: number,
    page: number,
    limit: number,
): PaginationMeta {
    return {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalItems: total,
        itemsPerPage: limit,
    };
}

/**
 * Build a complete paginated result ready for the API response.
 */
export function buildPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
): PaginatedResult<T> {
    return {
        data,
        pagination: buildPaginationMeta(total, page, limit),
    };
}
