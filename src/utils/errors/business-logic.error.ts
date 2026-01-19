import { BaseError } from './base.error';

/**
 * Custom error class for business logic errors
 * Used when business rules are violated
 */
export class BusinessLogicError extends BaseError {
    public readonly details?: Record<string, any>;

    constructor(message: string, details?: Record<string, any>) {
        super(message, 422);
        this.name = 'BusinessLogicError';
        this.details = details;
    }

    /**
     * Create a business logic error with additional context
     */
    static withContext(message: string, context: Record<string, any>): BusinessLogicError {
        return new BusinessLogicError(message, context);
    }

    /**
     * Create an insufficient resources error
     */
    static insufficientResources(
        resource: string,
        available: number,
        requested: number
    ): BusinessLogicError {
        return new BusinessLogicError(
            `Insufficient ${resource}. Available: ${available}, Requested: ${requested}.`,
            { resource, available, requested }
        );
    }

    /**
     * Create an invalid operation error
     */
    static invalidOperation(operation: string, reason: string): BusinessLogicError {
        return new BusinessLogicError(
            `Cannot ${operation}: ${reason}`,
            { operation, reason }
        );
    }
}
