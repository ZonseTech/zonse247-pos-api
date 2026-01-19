import { Prisma } from '../../databases/prisma/generated/prisma/client';
import { getFriendlyFieldName } from './field-name-mapper';

/**
 * Parse Prisma unique constraint error to get the affected field(s)
 * @param error - Prisma known request error
 * @returns User-friendly field name(s)
 */
export function parseUniqueConstraintField(error: Prisma.PrismaClientKnownRequestError): string {
    const target = error.meta?.target;

    // Handle array of fields (composite unique constraint)
    if (Array.isArray(target)) {
        return target.map(getFriendlyFieldName).join(' and ');
    }

    // Handle single field
    if (typeof target === 'string') {
        return getFriendlyFieldName(target);
    }

    // Try to extract from error message as fallback
    const match = error.message.match(/Unique constraint failed on the fields?: \(`(.+?)`\)/);
    if (match) {
        return match[1]
            .split(',')
            .map(f => getFriendlyFieldName(f.trim().replace(/`/g, '')))
            .join(' and ');
    }

    return 'field';
}

/**
 * Parse Prisma foreign key constraint error to get the related entity
 * @param error - Prisma known request error
 * @returns User-friendly entity name
 */
export function parseForeignKeyField(error: Prisma.PrismaClientKnownRequestError): string {
    const fieldName = error.meta?.field_name;

    if (typeof fieldName === 'string') {
        // Convert foreign key field to entity name
        const entityName = fieldName
            .replace('_fkey', '')
            .replace(/_id$/, '')
            .replace(/Id$/, '')
            .replace(/_/g, ' ');
        return entityName.charAt(0).toUpperCase() + entityName.slice(1);
    }

    return 'related record';
}

/**
 * Parse null constraint error to get the field name
 * @param error - Prisma known request error
 * @returns User-friendly field name
 */
export function parseNullConstraintField(error: Prisma.PrismaClientKnownRequestError): string {
    const constraint = error.meta?.constraint;
    if (typeof constraint === 'string') {
        return getFriendlyFieldName(constraint);
    }
    return 'field';
}

/**
 * Parse value too long error to get the column name
 * @param error - Prisma known request error
 * @returns User-friendly column name
 */
export function parseValueTooLongField(error: Prisma.PrismaClientKnownRequestError): string {
    const column = error.meta?.column;
    if (typeof column === 'string') {
        return getFriendlyFieldName(column);
    }
    return 'field';
}

/**
 * Check if the error is a Prisma known request error
 * @param error - Any error
 * @returns True if it's a Prisma known request error
 */
export function isPrismaKnownError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError;
}

/**
 * Check if the error is a Prisma validation error
 * @param error - Any error
 * @returns True if it's a Prisma validation error
 */
export function isPrismaValidationError(error: unknown): error is Prisma.PrismaClientValidationError {
    return error instanceof Prisma.PrismaClientValidationError;
}

/**
 * Check if the error is a Prisma initialization error
 * @param error - Any error
 * @returns True if it's a Prisma initialization error
 */
export function isPrismaInitError(error: unknown): error is Prisma.PrismaClientInitializationError {
    return error instanceof Prisma.PrismaClientInitializationError;
}

/**
 * Check if the error is a Prisma rust panic error
 * @param error - Any error
 * @returns True if it's a Prisma rust panic error
 */
export function isPrismaRustPanicError(error: unknown): error is Prisma.PrismaClientRustPanicError {
    return error instanceof Prisma.PrismaClientRustPanicError;
}
