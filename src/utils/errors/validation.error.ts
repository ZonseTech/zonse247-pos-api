import { BaseError } from './base.error';

/**
 * Custom error class for validation errors
 * Used when input validation fails
 */
export class ValidationError extends BaseError {
    public readonly field?: string;
    public readonly errors: Record<string, string>;

    constructor(
        message: string,
        errors: Record<string, string> = {},
        field?: string
    ) {
        super(message, 400);
        this.name = 'ValidationError';
        this.field = field;
        this.errors = errors;
    }

    /**
     * Get all validation error messages as a formatted string
     */
    getFormattedErrors(): string {
        return Object.entries(this.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
    }

    /**
     * Check if a specific field has an error
     */
    hasFieldError(fieldName: string): boolean {
        return fieldName in this.errors;
    }

    /**
     * Get error message for a specific field
     */
    getFieldError(fieldName: string): string | undefined {
        return this.errors[fieldName];
    }
}
