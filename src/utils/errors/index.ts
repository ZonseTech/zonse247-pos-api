/**
 * Error handling utilities - Main export file
 * 
 * This module provides a comprehensive error handling system for the application:
 * - Custom error classes for different error types
 * - Prisma error parsing and conversion
 * - User-friendly error messages
 * - Field name mapping for better error display
 */

// Error classes
export { BaseError } from './base.error';
export { DatabaseError } from './database.error';
export { ValidationError } from './validation.error';
export { NotFoundError } from './not-found.error';
export { ConflictError } from './conflict.error';
export { BusinessLogicError } from './business-logic.error';
export { TransactionError } from './transaction.error';

// Error codes
export { DbErrorCode, AppErrorCode } from './error-codes';

// Error handler
export { DbErrorHandler } from './db-error-handler';

// Error messages
export {
    ProductErrors,
    InventoryErrors,
    TransactionErrors,
    UserErrors,
    AuthErrors,
    GeneralErrors,
} from './error-messages';

// Field name mapping utilities
export {
    getFriendlyFieldName,
    registerFieldName,
    registerFieldNames,
    getFieldNameMap,
} from './field-name-mapper';

// Prisma error parsing utilities
export {
    parseUniqueConstraintField,
    parseForeignKeyField,
    parseNullConstraintField,
    parseValueTooLongField,
    isPrismaKnownError,
    isPrismaValidationError,
    isPrismaInitError,
    isPrismaRustPanicError,
} from './prisma-error-parser';
