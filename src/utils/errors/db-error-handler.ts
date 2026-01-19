import { Prisma } from '../../databases/prisma/generated/prisma/client';
import { DbErrorCode, AppErrorCode } from './error-codes';
import { DatabaseError } from './database.error';
import { ValidationError } from './validation.error';
import { NotFoundError } from './not-found.error';
import { ConflictError } from './conflict.error';
import { BusinessLogicError } from './business-logic.error';
import { TransactionError } from './transaction.error';
import {
    parseUniqueConstraintField,
    parseForeignKeyField,
    parseNullConstraintField,
    parseValueTooLongField,
    isPrismaKnownError,
    isPrismaValidationError,
    isPrismaInitError,
    isPrismaRustPanicError,
} from './prisma-error-parser';
import { getFriendlyFieldName } from './field-name-mapper';

/**
 * Database error handler utility
 * Converts various error types to user-friendly error messages
 */
export class DbErrorHandler {
    /**
     * Handle Prisma errors and convert them to user-friendly messages
     * @param error - The error to handle
     * @returns A DatabaseError with user-friendly message
     * @throws Custom errors (ValidationError, NotFoundError, etc.) are re-thrown
     */
    static handlePrismaError(error: unknown): DatabaseError {
        // Handle Prisma known request errors
        if (isPrismaKnownError(error)) {
            return this.handleKnownPrismaError(error);
        }

        // Handle Prisma validation errors
        if (isPrismaValidationError(error)) {
            return new DatabaseError(
                'Invalid data provided. Please check your input and try again.',
                AppErrorCode.VALIDATION_ERROR,
                400
            );
        }

        // Handle Prisma initialization errors
        if (isPrismaInitError(error)) {
            console.error('Database initialization error:', error);
            return new DatabaseError(
                'Unable to connect to the database. Please try again later.',
                AppErrorCode.CONNECTION_ERROR,
                503
            );
        }

        // Handle Prisma rust panic errors
        if (isPrismaRustPanicError(error)) {
            console.error('Critical database error:', error);
            return new DatabaseError(
                'A critical database error occurred. Please contact support.',
                AppErrorCode.CRITICAL_ERROR,
                500
            );
        }

        // Pass through custom errors
        if (this.isCustomError(error)) {
            throw error;
        }

        // Handle generic errors
        if (error instanceof Error) {
            return this.handleGenericError(error);
        }

        console.error('Unknown error type:', error);
        return new DatabaseError(
            'An unexpected error occurred. Please try again.',
            AppErrorCode.UNKNOWN_ERROR,
            500
        );
    }

    /**
     * Check if error is a custom application error
     */
    private static isCustomError(error: unknown): boolean {
        return (
            error instanceof DatabaseError ||
            error instanceof ValidationError ||
            error instanceof NotFoundError ||
            error instanceof ConflictError ||
            error instanceof BusinessLogicError ||
            error instanceof TransactionError
        );
    }

    /**
     * Handle generic Error instances
     */
    private static handleGenericError(error: Error): DatabaseError {
        const message = error.message;

        // Check for transaction-related error patterns
        if (this.isTransactionError(message)) {
            return this.handleTransactionError(error);
        }

        // Check for common error patterns
        if (message.includes('Duplicate') || message.includes('already assigned')) {
            return new DatabaseError(message, AppErrorCode.DUPLICATE_ERROR, 409);
        }

        if (message.includes('not found') || message.includes('Not found')) {
            return new DatabaseError(message, AppErrorCode.NOT_FOUND, 404);
        }

        if (message.includes('Insufficient') || message.includes('negative')) {
            return new DatabaseError(message, AppErrorCode.BUSINESS_LOGIC_ERROR, 422);
        }

        console.error('Unhandled error:', error);
        return new DatabaseError(
            'An unexpected error occurred. Please try again.',
            AppErrorCode.UNKNOWN_ERROR,
            500
        );
    }

    /**
     * Check if error message indicates a transaction error
     */
    private static isTransactionError(message: string): boolean {
        const lowerMessage = message.toLowerCase();
        return (
            lowerMessage.includes('transaction') ||
            lowerMessage.includes('deadlock') ||
            lowerMessage.includes('serialization') ||
            lowerMessage.includes('write conflict')
        );
    }

    /**
     * Handle known Prisma request errors
     */
    private static handleKnownPrismaError(error: Prisma.PrismaClientKnownRequestError): DatabaseError {
        switch (error.code) {
            case DbErrorCode.UNIQUE_CONSTRAINT: {
                const field = parseUniqueConstraintField(error);
                return new DatabaseError(
                    `A record with this ${field} already exists. Please use a different value.`,
                    AppErrorCode.DUPLICATE_ENTRY,
                    409,
                    field
                );
            }

            case DbErrorCode.FOREIGN_KEY_CONSTRAINT: {
                const entity = parseForeignKeyField(error);
                return new DatabaseError(
                    `The specified ${entity} does not exist. Please select a valid ${entity.toLowerCase()}.`,
                    AppErrorCode.INVALID_REFERENCE,
                    400,
                    entity
                );
            }

            case DbErrorCode.RECORD_NOT_FOUND:
                return new DatabaseError(
                    'The requested record was not found or has been deleted.',
                    AppErrorCode.NOT_FOUND,
                    404
                );

            case DbErrorCode.NULL_CONSTRAINT: {
                const nullField = parseNullConstraintField(error);
                return new DatabaseError(
                    `${getFriendlyFieldName(nullField)} is required and cannot be empty.`,
                    AppErrorCode.NULL_CONSTRAINT,
                    400,
                    nullField
                );
            }

            case DbErrorCode.REQUIRED_RELATION:
                return new DatabaseError(
                    'This record is linked to other data and cannot be modified in this way.',
                    AppErrorCode.RELATION_ERROR,
                    400
                );

            case DbErrorCode.TOO_MANY_DB_CONNECTIONS:
                console.error('Too many database connections:', error);
                return new DatabaseError(
                    'The system is experiencing high load. Please try again in a moment.',
                    AppErrorCode.CONNECTION_LIMIT,
                    503
                );

            case DbErrorCode.CONNECTION_REFUSED:
                console.error('Database connection refused:', error);
                return new DatabaseError(
                    'Unable to connect to the database. Please try again later.',
                    AppErrorCode.CONNECTION_REFUSED,
                    503
                );

            case DbErrorCode.TIMEOUT:
                return new DatabaseError(
                    'The operation took too long. Please try again.',
                    AppErrorCode.TIMEOUT,
                    504
                );

            case DbErrorCode.VALUE_TOO_LONG: {
                const longField = parseValueTooLongField(error);
                return new DatabaseError(
                    `The value for ${getFriendlyFieldName(longField)} is too long. Please shorten it.`,
                    AppErrorCode.VALUE_TOO_LONG,
                    400,
                    longField
                );
            }

            default:
                console.error(`Unhandled Prisma error code ${error.code}:`, error);
                return new DatabaseError(
                    'A database error occurred. Please try again.',
                    error.code,
                    500
                );
        }
    }

    /**
     * Handle transaction-specific errors
     */
    private static handleTransactionError(error: Error): DatabaseError {
        const message = error.message.toLowerCase();

        if (message.includes('deadlock')) {
            console.error('Database deadlock detected:', error);
            return new DatabaseError(
                'A database conflict occurred. Please try your operation again.',
                AppErrorCode.DEADLOCK,
                409
            );
        }

        if (message.includes('write conflict') || message.includes('serialization')) {
            console.error('Transaction write conflict:', error);
            return new DatabaseError(
                'Your changes conflicted with another operation. Please refresh and try again.',
                AppErrorCode.WRITE_CONFLICT,
                409
            );
        }

        if (message.includes('timeout') || message.includes('timed out')) {
            console.error('Transaction timeout:', error);
            return new DatabaseError(
                'The operation took too long to complete. Please try again.',
                AppErrorCode.TRANSACTION_TIMEOUT,
                504
            );
        }

        if (message.includes('already closed') || message.includes('rolled back') || message.includes('aborted')) {
            console.error('Transaction already closed:', error);
            return new DatabaseError(
                'The operation was interrupted. Please try again.',
                AppErrorCode.TRANSACTION_CLOSED,
                500
            );
        }

        if (message.includes('interactive transaction')) {
            console.error('Interactive transaction error:', error);
            return new DatabaseError(
                'A database transaction error occurred. Please try again.',
                AppErrorCode.TRANSACTION_ERROR,
                500
            );
        }

        console.error('Transaction error:', error);
        return new DatabaseError(
            'An error occurred during the operation. Please try again.',
            AppErrorCode.TRANSACTION_ERROR,
            500
        );
    }

    /**
     * Create a transaction error
     */
    static createTransactionError(
        message: string,
        code: string,
        isRetryable = false,
        originalError?: Error
    ): TransactionError {
        return new TransactionError(message, code, 500, isRetryable, originalError);
    }

    /**
     * Create a validation error with field-specific messages
     */
    static createValidationError(
        message: string,
        errors: Record<string, string> = {}
    ): ValidationError {
        return new ValidationError(message, errors);
    }

    /**
     * Create a not found error
     */
    static createNotFoundError(resource: string, identifier?: string): NotFoundError {
        return new NotFoundError(resource, identifier);
    }

    /**
     * Create a conflict error
     */
    static createConflictError(message: string, field?: string): ConflictError {
        return new ConflictError(message, field);
    }

    /**
     * Create a business logic error
     */
    static createBusinessLogicError(
        message: string,
        details?: Record<string, any>
    ): BusinessLogicError {
        return new BusinessLogicError(message, details);
    }

    /**
     * Check if error is operational (expected errors vs programming errors)
     */
    static isOperationalError(error: unknown): boolean {
        if (error instanceof Error) {
            return (error as any).isOperational === true;
        }
        return false;
    }

    /**
     * Get HTTP status code from error
     */
    static getStatusCode(error: unknown): number {
        if (
            error instanceof DatabaseError ||
            error instanceof ValidationError ||
            error instanceof NotFoundError ||
            error instanceof ConflictError ||
            error instanceof BusinessLogicError ||
            error instanceof TransactionError
        ) {
            return error.statusCode;
        }
        return 500;
    }
}
