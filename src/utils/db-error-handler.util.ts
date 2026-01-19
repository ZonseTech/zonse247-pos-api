/**
 * Database Error Handler Utility
 * 
 * This file re-exports all error handling utilities from the modular errors directory.
 * This maintains backward compatibility with existing imports.
 * 
 * For new code, prefer importing directly from './errors' or specific files:
 * @example
 * import { DatabaseError, ValidationError, DbErrorHandler } from './errors';
 * 
 * @see ./errors/index.ts for the full list of exports
 */

// Re-export everything from the errors module for backward compatibility
export {
    // Error classes
    BaseError,
    DatabaseError,
    ValidationError,
    NotFoundError,
    ConflictError,
    BusinessLogicError,
    TransactionError,

    // Error codes
    DbErrorCode,
    AppErrorCode,

    // Error handler
    DbErrorHandler,

    // Error messages
    ProductErrors,
    InventoryErrors,
    TransactionErrors,
    UserErrors,
    AuthErrors,
    GeneralErrors,

    // Field name mapping utilities
    getFriendlyFieldName,
    registerFieldName,
    registerFieldNames,
    getFieldNameMap,

    // Prisma error parsing utilities
    parseUniqueConstraintField,
    parseForeignKeyField,
    parseNullConstraintField,
    parseValueTooLongField,
    isPrismaKnownError,
    isPrismaValidationError,
    isPrismaInitError,
    isPrismaRustPanicError,
} from './errors';

