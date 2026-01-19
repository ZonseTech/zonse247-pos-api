import { BaseError } from './base.error';

/**
 * Custom error class for conflict errors
 * Used when there's a conflict like duplicates, already exists, etc.
 */
export class ConflictError extends BaseError {
    public readonly field?: string;

    constructor(message: string, field?: string) {
        super(message, 409);
        this.name = 'ConflictError';
        this.field = field;
    }

    /**
     * Create a duplicate entry conflict error
     */
    static duplicate(field: string, value?: string): ConflictError {
        const message = value
            ? `A record with ${field} "${value}" already exists.`
            : `A record with this ${field} already exists.`;
        return new ConflictError(message, field);
    }

    /**
     * Create an already exists conflict error
     */
    static alreadyExists(resource: string): ConflictError {
        return new ConflictError(`${resource} already exists.`, resource.toLowerCase());
    }
}
