import { BaseError } from './base.error';

/**
 * Custom error class for transaction errors
 * Used when database transaction operations fail
 */
export class TransactionError extends BaseError {
    public readonly code: string;
    public readonly isRetryable: boolean;
    public readonly originalError?: Error;

    constructor(
        message: string,
        code: string,
        statusCode = 500,
        isRetryable = false,
        originalError?: Error
    ) {
        super(message, statusCode);
        this.name = 'TransactionError';
        this.code = code;
        this.isRetryable = isRetryable;
        this.originalError = originalError;
    }

    /**
     * Create a deadlock transaction error
     */
    static deadlock(originalError?: Error): TransactionError {
        return new TransactionError(
            'A database conflict occurred. Please try your operation again.',
            'DEADLOCK',
            409,
            true,
            originalError
        );
    }

    /**
     * Create a timeout transaction error
     */
    static timeout(originalError?: Error): TransactionError {
        return new TransactionError(
            'The operation took too long to complete. Please try again.',
            'TRANSACTION_TIMEOUT',
            504,
            true,
            originalError
        );
    }

    /**
     * Create a write conflict transaction error
     */
    static writeConflict(originalError?: Error): TransactionError {
        return new TransactionError(
            'Your changes conflicted with another operation. Please refresh and try again.',
            'WRITE_CONFLICT',
            409,
            true,
            originalError
        );
    }

    /**
     * Create a rollback transaction error
     */
    static rollback(reason: string, originalError?: Error): TransactionError {
        return new TransactionError(
            `The operation was rolled back: ${reason}`,
            'ROLLBACK',
            500,
            false,
            originalError
        );
    }
}
