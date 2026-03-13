/**
 * Onboarding Module Custom Errors
 * Typed error classes for better error handling
 */

import { HTTP_STATUS } from '../constants';

/**
 * Base error class for onboarding operations
 */
export class OnboardingError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_ERROR) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = true;

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Create error response object
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
        };
    }
}

/**
 * Validation related errors
 */
export class ValidationError extends OnboardingError {
    public readonly field?: string;
    public readonly errors: Array<{ field: string; message: string }>;

    constructor(
        message: string,
        field?: string,
        errors: Array<{ field: string; message: string }> = []
    ) {
        super(message, HTTP_STATUS.BAD_REQUEST);
        this.field = field;
        this.errors = errors.length > 0 ? errors : field ? [{ field, message }] : [];
    }

    /**
     * Create a validation error for a missing required field
     */
    static missingField(field: string): ValidationError {
        return new ValidationError(`${field} is required`, field);
    }

    /**
     * Create a validation error for invalid array input
     */
    static invalidArray(field: string): ValidationError {
        return new ValidationError(`${field} array is required`, field);
    }

    /**
     * Create a validation error for invalid table
     */
    static invalidTable(table: string, validTables: string[]): ValidationError {
        return new ValidationError(
            `Invalid table '${table}'. Valid tables: ${validTables.join(', ')}`,
            'table'
        );
    }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends OnboardingError {
    public readonly resourceType: string;
    public readonly resourceId?: string;

    constructor(resourceType: string, resourceId?: string) {
        const message = resourceId
            ? `${resourceType} with ID '${resourceId}' not found`
            : `${resourceType} not found`;
        super(message, HTTP_STATUS.NOT_FOUND);
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
}

/**
 * Conflict errors (e.g., terminal already activated)
 */
export class ConflictError extends OnboardingError {
    public readonly resourceType: string;
    public readonly reason: string;

    constructor(resourceType: string, reason: string) {
        super(`${resourceType}: ${reason}`, HTTP_STATUS.CONFLICT);
        this.resourceType = resourceType;
        this.reason = reason;
    }

    static alreadyExists(resourceType: string): ConflictError {
        return new ConflictError(resourceType, 'already exists');
    }

    static alreadyActivated(resourceType: string): ConflictError {
        return new ConflictError(resourceType, 'already activated');
    }
}

/**
 * Access/Permission errors
 */
export class ForbiddenError extends OnboardingError {
    constructor(message = 'Access denied') {
        super(message, HTTP_STATUS.FORBIDDEN);
    }

    static terminalBlocked(): ForbiddenError {
        return new ForbiddenError('Terminal is blocked');
    }
}

/**
 * Subscription/Payment errors
 */
export class SubscriptionError extends OnboardingError {
    constructor(message = 'No active subscription') {
        super(message, HTTP_STATUS.PAYMENT_REQUIRED);
    }

    static noActiveSubscription(): SubscriptionError {
        return new SubscriptionError('No active subscription found');
    }

    static subscriptionExpired(): SubscriptionError {
        return new SubscriptionError('Subscription has expired');
    }
}

/**
 * Data sync errors
 */
export class SyncError extends OnboardingError {
    public readonly table?: string;
    public readonly recordId?: string;
    public readonly originalError?: Error;

    constructor(
        message: string,
        table?: string,
        recordId?: string,
        originalError?: Error
    ) {
        super(message, HTTP_STATUS.INTERNAL_ERROR);
        this.table = table;
        this.recordId = recordId;
        this.originalError = originalError;
    }

    static tableSync(table: string, error: Error): SyncError {
        return new SyncError(
            `Failed to sync table '${table}': ${error.message}`,
            table,
            undefined,
            error
        );
    }

    static recordSync(table: string, recordId: string, error: Error): SyncError {
        return new SyncError(
            `Failed to sync record '${recordId}' in table '${table}': ${error.message}`,
            table,
            recordId,
            error
        );
    }
}

/**
 * Bulk operation result with partial failures
 */
export class PartialSuccessError extends OnboardingError {
    public readonly successCount: number;
    public readonly failureCount: number;
    public readonly failures: Array<{ id: string; error: string }>;

    constructor(
        successCount: number,
        failureCount: number,
        failures: Array<{ id: string; error: string }> = []
    ) {
        super(
            `Operation partially completed: ${successCount} succeeded, ${failureCount} failed`,
            HTTP_STATUS.MULTI_STATUS
        );
        this.successCount = successCount;
        this.failureCount = failureCount;
        this.failures = failures;
    }
}

/**
 * Helper to extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Unknown error occurred';
}

/**
 * Helper to map error to appropriate status code
 */
export function mapErrorToStatusCode(error: unknown): number {
    if (error instanceof OnboardingError) {
        return error.statusCode;
    }

    const message = getErrorMessage(error).toLowerCase();

    if (message.includes('invalid activation code')) return HTTP_STATUS.BAD_REQUEST;
    if (message.includes('not found')) return HTTP_STATUS.NOT_FOUND;
    if (message.includes('already activated')) return HTTP_STATUS.CONFLICT;
    if (message.includes('blocked')) return HTTP_STATUS.FORBIDDEN;
    if (message.includes('no active subscription')) return HTTP_STATUS.PAYMENT_REQUIRED;

    return HTTP_STATUS.INTERNAL_ERROR;
}
