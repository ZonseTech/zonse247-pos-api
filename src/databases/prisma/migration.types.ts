/**
 * Migration Type Definitions
 * 
 * These types define the structure for database migrations.
 * Migrations support both SQLite and MySQL databases.
 */

/**
 * Database type
 */
export type DatabaseType = 'sqlite' | 'mysql';

/**
 * SQL statements can be either a single array (same for both DBs)
 * or database-specific arrays
 */
export type SqlStatements = string[] | { sqlite: string[]; mysql: string[] };

/**
 * Migration definition
 */
export interface Migration {
    /**
     * Unique version identifier
     * Format: YYYYMMDD_NN (e.g., 20260223_01)
     */
    version: string;

    /**
     * Human-readable description of what the migration does
     */
    description: string;

    /**
     * SQL statements to apply the migration (upgrade)
     * Can be database-specific or universal
     */
    up: SqlStatements;

    /**
     * Optional SQL statements to rollback the migration (downgrade)
     * Used for reverting changes if needed
     */
    down?: SqlStatements;
}

/**
 * Migration module export structure
 * Each migration file should export an object with this shape
 */
export interface MigrationModule {
    migration: Migration;
}

/**
 * Migration execution result
 */
export interface MigrationResult {
    success: boolean;
    migrationsApplied: string[];
    error?: string;
    backupPath?: string;
}

/**
 * Migration status
 */
export interface MigrationStatus {
    currentVersion: string | null;
    targetVersion: string;
    pendingCount: number;
    pendingMigrations: string[];
}

/**
 * Database integrity check result
 */
export interface IntegrityCheckResult {
    valid: boolean;
    issues: string[];
}

/**
 * Helper to get SQL statements for a specific database type
 */
export function getSqlStatements(sql: SqlStatements, dbType: DatabaseType): string[] {
    if (Array.isArray(sql)) {
        return sql;
    }
    return sql[dbType] || [];
}

/**
 * Parse migration version from filename
 * @example "20260223_01_add_users_table.ts" -> "20260223_01"
 */
export function parseVersionFromFilename(filename: string): string | null {
    const match = filename.match(/^(\d{8}_\d{2})/);
    return match ? match[1] : null;
}

/**
 * Generate migration filename
 * @example generateMigrationFilename("20260223_01", "add_users_table") -> "20260223_01_add_users_table.ts"
 */
export function generateMigrationFilename(version: string, name: string): string {
    const safeName = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return `${version}_${safeName}.ts`;
}
