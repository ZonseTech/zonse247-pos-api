import { Response } from 'express';
import { BaseError } from './base.error';
import { BaseController } from '../../controllers/base.controller';
import { ConflictError, NotFoundError, DatabaseError, BusinessLogicError } from '../db-error-handler.util';

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

    /**
     * @method  validateRequired
     * @desc    Check if all required fields are present
     * @param   fields - Object containing field values
     * @param   requiredFields - Array of required field names
     * @returns string | null - Error message if validation fails, null if valid
     * @private
     */
    static validateRequired(fields: Record<string, any>, requiredFields: string[]): string | null {
        for (const field of requiredFields) {
            if (!fields[field]) {
                return `Missing required field: ${field}`;
            }
        }
        return null;
    }

    static handleError(res: Response, error: unknown): void {
        if (error instanceof ValidationError) {
            const errorDetails = JSON.stringify(error.errors);
            BaseController.sendResponse(res, 400, false, error.message, undefined, errorDetails);
            return;
        }

        if (error instanceof ConflictError) {
            BaseController.sendResponse(res, 409, false, error.message, undefined, error.field);
            return;
        }

        if (error instanceof NotFoundError) {
            BaseController.sendResponse(res, 404, false, error.message);
            return;
        }

        if (error instanceof BusinessLogicError) {
            BaseController.sendResponse(res, 400, false, error.message);
            return;
        }

        if (error instanceof DatabaseError) {
            console.error('Database error:', error);
            BaseController.sendResponse(res, 500, false, error.message);
            return;
        }

        // Handle unknown errors
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Unexpected error in UserController:', error);
        BaseController.sendResponse(res, 500, false, errorMessage);
    }
}
