import { BaseError } from './base.error';

/**
 * Custom error class for database operations
 * Used when database-level errors occur (connection issues, constraints, etc.)
 */
export class DatabaseError extends BaseError {
    public readonly code: string;
    public readonly field?: string;

    constructor(
        message: string,
        code: string,
        statusCode = 500,
        field?: string
    ) {
        super(message, statusCode);
        this.name = 'DatabaseError';
        this.code = code;
        this.field = field;
    }
}
