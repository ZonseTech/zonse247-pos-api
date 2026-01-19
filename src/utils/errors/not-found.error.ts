import { BaseError } from './base.error';

/**
 * Custom error class for not found resources
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends BaseError {
    public readonly resource: string;
    public readonly identifier?: string;

    constructor(resource: string, identifier?: string) {
        const message = identifier
            ? `${resource} with identifier "${identifier}" not found`
            : `${resource} not found`;

        super(message, 404);
        this.name = 'NotFoundError';
        this.resource = resource;
        this.identifier = identifier;
    }

    /**
     * Create a NotFoundError for a specific entity type
     */
    static forEntity(entityName: string, id: string): NotFoundError {
        return new NotFoundError(entityName, id);
    }
}
