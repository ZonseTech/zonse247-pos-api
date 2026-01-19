/**
 * Product-specific error messages
 */
export const ProductErrors = {
    SKU_EXISTS: (sku: string) => `A product with SKU "${sku}" already exists in this branch.`,
    BARCODE_EXISTS: (barcode: string, productName?: string) =>
        productName
            ? `Barcode "${barcode}" is already assigned to product "${productName}".`
            : `Barcode "${barcode}" is already in use by another product.`,
    PRODUCT_NOT_FOUND: (id: string) => `Product with ID "${id}" was not found.`,
    CATEGORY_NOT_FOUND: (id: string) => `Category with ID "${id}" does not exist.`,
    INVALID_PRICE: 'Selling price must be a positive number.',
    INVALID_QUANTITY: 'Quantity must be a non-negative number.',
    INVALID_BARCODE_FORMAT: 'Barcode format is invalid.',
    DUPLICATE_BARCODES_IN_REQUEST: (barcode: string) => `Duplicate barcode "${barcode}" found in the request.`,
};

/**
 * Inventory-specific error messages
 */
export const InventoryErrors = {
    INSUFFICIENT_STOCK: (productName: string, available: number, requested: number) =>
        `Insufficient stock for "${productName}". Available: ${available}, Requested: ${requested}.`,
    NEGATIVE_STOCK_NOT_ALLOWED: (productName: string) =>
        `Negative stock is not allowed for "${productName}".`,
    INVENTORY_NOT_FOUND: (productId: string) =>
        `Inventory record for product "${productId}" was not found.`,
    INVALID_ADJUSTMENT: 'Adjustment value must be a valid number.',
    REORDER_EXCEEDS_MAX: (reorderPoint: number, maxStock: number) =>
        `Reorder point (${reorderPoint}) cannot exceed maximum stock (${maxStock}).`,
    MIN_EXCEEDS_MAX: (minStock: number, maxStock: number) =>
        `Minimum stock (${minStock}) cannot exceed maximum stock (${maxStock}).`,
};

/**
 * Transaction-specific error messages
 */
export const TransactionErrors = {
    DEADLOCK: 'A database conflict occurred. Please try your operation again.',
    WRITE_CONFLICT: 'Your changes conflicted with another operation. Please refresh and try again.',
    TIMEOUT: 'The operation took too long to complete. Please try again.',
    ROLLBACK: 'The operation was rolled back due to an error. Please try again.',
    CONCURRENT_MODIFICATION: (resource: string) =>
        `The ${resource} was modified by another user. Please refresh and try again.`,
    PARTIAL_FAILURE: (successCount: number, totalCount: number) =>
        `Only ${successCount} of ${totalCount} operations completed successfully. Please check and retry the failed items.`,
    INTEGRITY_VIOLATION: 'The operation would violate data integrity rules. Please check your data.',
};

/**
 * User-specific error messages
 */
export const UserErrors = {
    USER_NOT_FOUND: (id: string) => `User with ID "${id}" was not found.`,
    USER_EXISTS: 'A user with this username or email already exists.',
    USERNAME_EXISTS: (username: string) => `Username "${username}" is already taken.`,
    EMAIL_EXISTS: (email: string) => `Email "${email}" is already in use.`,
    ROLE_NOT_FOUND: (id: string) => `Role with ID "${id}" does not exist.`,
    BRANCH_NOT_FOUND: (id: string) => `Branch with ID "${id}" does not exist.`,
    INVALID_EMAIL: 'Please provide a valid email address.',
    INVALID_STATUS: 'Status must be one of: active, inactive, suspended.',
    PASSWORD_REQUIRED: 'Password is required.',
    PASSWORD_TOO_SHORT: (minLength: number) => `Password must be at least ${minLength} characters long.`,
    USERNAME_REQUIRED: 'Username is required.',
    FULLNAME_REQUIRED: 'Full name is required.',
    ROLE_REQUIRED: 'Role is required.',
    CANNOT_DELETE_SELF: 'You cannot delete your own account.',
    CANNOT_DEACTIVATE_SELF: 'You cannot deactivate your own account.',
};

/**
 * Authentication-specific error messages
 */
export const AuthErrors = {
    INVALID_CREDENTIALS: 'Invalid username or password.',
    ACCOUNT_LOCKED: 'Your account has been locked. Please contact support.',
    ACCOUNT_INACTIVE: 'Your account is inactive. Please contact your administrator.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    TOKEN_INVALID: 'Invalid or expired authentication token.',
    TOKEN_MISSING: 'Authentication token is required.',
};

/**
 * General error messages
 */
export const GeneralErrors = {
    UNEXPECTED: 'An unexpected error occurred. Please try again.',
    DATABASE_CONNECTION: 'Unable to connect to the database. Please try again later.',
    SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait before trying again.',
    INVALID_REQUEST: 'Invalid request format.',
    MISSING_REQUIRED_FIELD: (field: string) => `${field} is required.`,
};
