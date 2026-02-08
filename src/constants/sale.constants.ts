/**
 * Valid SaleStatus values with common aliases
 * Maps various input strings to canonical database values
 */
export const SALE_STATUS_MAP: Record<string, string> = {
    'PENDING': 'PENDING',
    'COMPLETED': 'COMPLETED',
    'VOIDED': 'VOIDED',
    'REFUNDED': 'REFUNDED',
    'PARTIALLY_REFUNDED': 'PARTIALLY_REFUNDED',
    'RETURNED': 'REFUNDED',
    'RETURN': 'REFUNDED',
    'VOID': 'VOIDED',
    'CANCELLED': 'VOIDED',
    'CANCELED': 'VOIDED',
    'PARTIAL_REFUND': 'PARTIALLY_REFUNDED',
} as const;

/**
 * List of valid canonical status values for validation messages
 */
export const VALID_SALE_STATUSES = [
    'PENDING',
    'COMPLETED',
    'VOIDED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
] as const;

export type ValidSaleStatus = typeof VALID_SALE_STATUSES[number];

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 500,
} as const;

export const SALE_NUMBER = {
    PREFIX: 'SALE',
    SEQUENCE_PADDING: 5,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 50,
} as const;

export const ERROR_MESSAGES = {
    INVALID_STATUS: `Invalid status. Valid values: ${VALID_SALE_STATUSES.join(', ')}`,
    MISSING_VARIANT_ID: 'Item must have a variantId or productId',
    INSUFFICIENT_PAYMENT: 'Insufficient payment amount',
    SALE_NOT_FOUND: 'Sale not found',
    VARIANT_NOT_FOUND: 'Product variant not found or inactive',
    NO_INVENTORY: 'No inventory record found',
    SALE_ALREADY_VOIDED: 'Sale already voided',
    INSUFFICIENT_STOCK: 'Insufficient stock',
    CREATE_FAILED: 'Failed to complete sale',
    GET_FAILED: 'Failed to get sale',
    LIST_FAILED: 'Failed to list sales',
    VOID_FAILED: 'Failed to void sale',
    SUMMARY_FAILED: 'Failed to get sales summaries',
} as const;

export const SUCCESS_MESSAGES = {
    SALE_CREATED: 'Sale completed successfully',
    SALE_RETRIEVED: 'Sale retrieved successfully',
    SALES_LISTED: 'Sales retrieved successfully',
    SALE_VOIDED: 'Sale voided successfully',
    SUMMARY_RETRIEVED: 'Sales summaries retrieved successfully',
} as const;

export const MOVEMENT_TYPES = {
    SALE: 'SALE',
    RETURN: 'RETURN',
    VOID: 'RETURN',
} as const;

/**
 * Map input status string to valid SaleStatus enum value
 * @param status - Input status string (case-insensitive)
 * @returns Mapped status or undefined if invalid
 */
export function mapSaleStatus(status: string | undefined): string | undefined {
    if (!status) return undefined;
    const statusUpper = status.toString().toUpperCase();
    return SALE_STATUS_MAP[statusUpper];
}

/**
 * Check if a status string is valid
 * @param status - Status to validate
 * @returns true if valid
 */
export function isValidSaleStatus(status: string): boolean {
    return mapSaleStatus(status) !== undefined;
}

/**
 * Parse date string to Date object with start of day time
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object at start of day
 */
export function parseStartDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
}

/**
 * Parse date string to Date object with end of day time
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object at end of day
 */
export function parseEndDate(dateStr: string): Date {
    const date = new Date(dateStr + 'T23:59:59.999');
    return date;
}

/**
 * Round a number to 2 decimal places (for currency)
 * @param value - Number to round
 * @returns Rounded value
 */
export function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}
