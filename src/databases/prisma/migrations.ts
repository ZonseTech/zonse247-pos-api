/**
 * Database Migration System
 * 
 * Safe versioning & upgrade flow:
 * 1. Template DB has version embedded at build time
 * 2. User's DB has version tracked in db_meta table
 * 3. On startup: compare versions → backup → migrate → verify
 * 
 * Migrations are statically imported via the registry (migrations-app/index.ts)
 * to ensure they are bundled correctly when the code is compiled/bundled
 * (e.g., by Vite for Electron apps).
 */

import fsp from 'fs/promises';
import path from 'path';
import { getDatabaseConfig } from '../../config/db';
import {
    Migration,
    MigrationResult,
    MigrationStatus,
    IntegrityCheckResult,
    DatabaseType,
    getSqlStatements,
} from './migration.types';
import { getAllRegisteredMigrations } from './migrations-app';

// Re-export types for backward compatibility
export { Migration, DatabaseType, getSqlStatements };

/**
 * Current schema version - INCREMENT THIS when schema changes
 * Format: YYYYMMDD_NN (date + sequence number)
 */
export const CURRENT_DB_VERSION = '20260306_06';

/**
 * Minimum supported version for migration (older versions require fresh install)
 */
export const MIN_MIGRATABLE_VERSION = '20250101_01';

/**
 * Get the current database type based on configuration
 */
export const getDatabaseType = (): DatabaseType => {
    const config = getDatabaseConfig();
    return config.provider as unknown as DatabaseType;
};

/**
 * Get all migrations from the static registry, sorted by version
 */
export function getAllMigrations(): Migration[] {
    return getAllRegisteredMigrations();
}

/**
 * Export MIGRATIONS for backward compatibility
 */
export const MIGRATIONS: Migration[] = getAllMigrations();

/**
 * Database Migration Manager
 */
export class MigrationManager {
    private db: any; // Prisma client
    private userDataPath: string;
    private dbType: DatabaseType;

    constructor(prismaClient: any, userDataPath: string, dbType?: DatabaseType) {
        this.db = prismaClient;
        this.userDataPath = userDataPath;
        this.dbType = dbType || getDatabaseType();
    }

    /**
     * Get all migrations (refreshes file migrations)
     */
    private getMigrations(): Migration[] {
        return getAllMigrations();
    }

    /**
     * Get current database version
     */
    async getCurrentVersion(): Promise<string | null> {
        try {
            let result;
            if (this.dbType === 'mysql') {
                result = await this.db.$queryRawUnsafe(
                    "SELECT `value` FROM db_meta WHERE `key` = 'schema_version'"
                );
            } else {
                result = await this.db.$queryRaw`
                    SELECT value FROM db_meta WHERE key = 'schema_version'
                `;
            }
            return result?.[0]?.value || null;
        } catch {
            // db_meta table doesn't exist yet
            return null;
        }
    }

    /**
     * Set database version
     */
    private async setVersion(version: string): Promise<void> {
        if (this.dbType === 'mysql') {
            await this.db.$executeRawUnsafe(
                "REPLACE INTO db_meta (`key`, `value`, updated_at) VALUES ('schema_version', ?, CURRENT_TIMESTAMP)",
                version
            );
        } else {
            await this.db.$executeRaw`
                INSERT OR REPLACE INTO db_meta (key, value, updated_at)
                VALUES ('schema_version', ${version}, CURRENT_TIMESTAMP)
            `;
        }
    }

    /**
     * Check if migrations are needed
     */
    async needsMigration(): Promise<boolean> {
        const currentVersion = await this.getCurrentVersion();

        if (!currentVersion) {
            // No version info - might be old DB or fresh install
            return true;
        }

        return currentVersion < CURRENT_DB_VERSION;
    }

    /**
     * Get pending migrations
     */
    async getPendingMigrations(): Promise<Migration[]> {
        const currentVersion = await this.getCurrentVersion();
        const allMigrations = this.getMigrations();

        if (!currentVersion) {
            // Return all migrations
            return allMigrations;
        }

        // Return migrations newer than current version
        return allMigrations.filter(m => m.version > currentVersion);
    }

    /**
     * Get migration status
     */
    async getStatus(): Promise<MigrationStatus> {
        const currentVersion = await this.getCurrentVersion();
        const pendingMigrations = await this.getPendingMigrations();

        return {
            currentVersion,
            targetVersion: CURRENT_DB_VERSION,
            pendingCount: pendingMigrations.length,
            pendingMigrations: pendingMigrations.map(m => m.version),
        };
    }

    /**
     * Create a backup of the database before migration
     */
    async createBackup(dbPath: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.userDataPath, 'backups');
        const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

        await fsp.mkdir(backupDir, { recursive: true });
        await fsp.copyFile(dbPath, backupPath);

        console.log(`📦 Database backup created: ${backupPath}`);
        return backupPath;
    }

    /**
     * Restore database from backup
     */
    async restoreBackup(backupPath: string, dbPath: string): Promise<void> {
        await fsp.copyFile(backupPath, dbPath);
        console.log(`✓ Database restored from backup`);
    }

    /**
     * Run all pending migrations
     * @param dbPath - Path to database file (required for SQLite backups, optional for MySQL)
     */
    async migrate(dbPath?: string): Promise<MigrationResult> {
        const pendingMigrations = await this.getPendingMigrations();

        if (pendingMigrations.length === 0) {
            return { success: true, migrationsApplied: [] };
        }

        console.log(`\n📊 Database Migration`);
        console.log(`   Current version: ${await this.getCurrentVersion() || 'unknown'}`);
        console.log(`   Target version: ${CURRENT_DB_VERSION}`);
        console.log(`   Pending migrations: ${pendingMigrations.length}\n`);

        let backupPath: string | undefined;
        if (dbPath && this.dbType === 'sqlite') {
            try {
                backupPath = await this.createBackup(dbPath);
            } catch (backupError) {
                console.error('⚠️ Failed to create backup, proceeding anyway...');
            }
        }

        const migrationsApplied: string[] = [];

        for (const migration of pendingMigrations) {
            console.log(`🔄 Applying migration ${migration.version}: ${migration.description}`);

            try {
                const sqlStatements = getSqlStatements(migration.up, this.dbType);

                for (const sql of sqlStatements) {
                    if (sql.trim()) {
                        try {
                            await this.db.$executeRawUnsafe(sql);
                        } catch (sqlError) {
                            const errorMsg = (sqlError as Error).message;

                            // Handle common idempotent errors
                            if (this.isSkippableError(errorMsg, sql)) {
                                console.log(`   ⏭️ Skipping (already applied): ${sql.substring(0, 60)}...`);
                                continue;
                            }
                            throw sqlError;
                        }
                    }
                }

                await this.setVersion(migration.version);
                migrationsApplied.push(migration.version);
                console.log(`   ✓ Migration ${migration.version} applied`);
            } catch (error) {
                const errorMessage = (error as Error).message;
                console.error(`   ❌ Migration ${migration.version} failed: ${errorMessage}`);

                if (backupPath && dbPath) {
                    console.log('🔙 Attempting rollback to backup...');
                    try {
                        await this.restoreBackup(backupPath, dbPath);
                        return {
                            success: false,
                            migrationsApplied,
                            error: `Migration ${migration.version} failed: ${errorMessage}. Database restored from backup.`,
                            backupPath,
                        };
                    } catch (rollbackError) {
                        return {
                            success: false,
                            migrationsApplied,
                            error: `Migration failed AND rollback failed! Backup at: ${backupPath}`,
                            backupPath,
                        };
                    }
                }

                return {
                    success: false,
                    migrationsApplied,
                    error: `Migration ${migration.version} failed: ${errorMessage}`,
                };
            }
        }

        console.log(`\n✓ All migrations applied successfully`);
        console.log(`   New version: ${CURRENT_DB_VERSION}\n`);

        return {
            success: true,
            migrationsApplied,
            backupPath,
        };
    }

    /**
     * Check if an SQL error can be safely skipped (idempotent operation)
     * 
     * This handles two scenarios:
     * 1. Fresh installations: template.db has the final schema, so intermediate
     *    migration steps (like copying from old columns) should be skipped
     * 2. Partial migrations: idempotent operations that were already applied
     */
    private isSkippableError(errorMsg: string, sql: string): boolean {
        if (this.dbType === 'sqlite') {
            // Schema changes that are idempotent
            if (errorMsg.includes('duplicate column name')) return true;
            if (errorMsg.includes('table') && errorMsg.includes('already exists')) return true;
            if (errorMsg.includes('index') && errorMsg.includes('already exists')) return true;

            // "no such column" errors - these occur on fresh installations where
            // template.db has the final schema, so old columns never existed.
            // Safe to skip UPDATE/INSERT statements that reference non-existent columns
            // since there's no data to migrate.
            if (errorMsg.includes('no such column')) {
                // Skip all UPDATE statements - they're data migrations for columns that
                // don't exist in fresh installs (already have correct schema)
                if (sql.includes('UPDATE')) return true;

                // Skip INSERT data migrations (e.g., migrating products to product_variants)
                if (sql.includes('INSERT')) return true;
            }

            // "no such table" errors - these occur on fresh installations where
            // the table was removed/renamed in the final schema (e.g., tenant_subscriptions
            // was replaced by branch_subscriptions). Safe to skip all operations on 
            // non-existent tables.
            if (errorMsg.includes('no such table')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Verify database integrity after migration
     * @param checkVersion - Whether to check if version matches CURRENT_DB_VERSION (skip after fresh migration)
     */
    async verifyIntegrity(checkVersion = true): Promise<IntegrityCheckResult> {
        const issues: string[] = [];

        try {
            // Check database integrity (SQLite-specific)
            if (this.dbType === 'sqlite') {
                const integrityCheck = await this.db.$queryRaw`PRAGMA integrity_check`;
                if ((integrityCheck as any)?.[0]?.integrity_check !== 'ok') {
                    issues.push('SQLite integrity check failed');
                }
            }

            // Verify essential tables exist
            const essentialTables = ['app_setups', 'db_meta'];
            for (const table of essentialTables) {
                try {
                    if (this.dbType === 'mysql') {
                        await this.db.$queryRawUnsafe(`SELECT 1 FROM \`${table}\` LIMIT 1`);
                    } else {
                        await this.db.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
                    }
                } catch {
                    issues.push(`Essential table missing: ${table}`);
                }
            }

            // Verify version is current (only if requested)
            if (checkVersion) {
                const version = await this.getCurrentVersion();
                if (version !== CURRENT_DB_VERSION) {
                    issues.push(`Version mismatch: expected ${CURRENT_DB_VERSION}, got ${version}`);
                }
            }
        } catch (error) {
            issues.push(`Verification error: ${(error as Error).message}`);
        }

        return {
            valid: issues.length === 0,
            issues,
        };
    }

    /**
     * Clean up old backups (keep last N)
     */
    async cleanupOldBackups(keepCount = 5): Promise<void> {
        const backupDir = path.join(this.userDataPath, 'backups');

        try {
            const files = await fsp.readdir(backupDir);
            const backupFiles = files
                .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
                .sort()
                .reverse(); // Newest first

            // Delete old backups
            const filesToDelete = backupFiles.slice(keepCount);
            for (const file of filesToDelete) {
                await fsp.unlink(path.join(backupDir, file));
                console.log(`🗑️ Deleted old backup: ${file}`);
            }
        } catch {
            // Backup directory may not exist
        }
    }
}

/**
 * Ensure db_meta table exists (without setting version)
 * Call this BEFORE running migrations
 */
export async function ensureDbMetaTableExists(prismaClient: any, dbType?: DatabaseType): Promise<void> {
    const currentDbType = dbType || getDatabaseType();

    try {
        if (currentDbType === 'mysql') {
            await prismaClient.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS db_meta (
                    \`key\` VARCHAR(255) PRIMARY KEY NOT NULL,
                    \`value\` TEXT NOT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
        } else {
            await prismaClient.$executeRaw`
                CREATE TABLE IF NOT EXISTS "db_meta" (
                    "key" TEXT PRIMARY KEY NOT NULL,
                    "value" TEXT NOT NULL,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `;
        }
    } catch (error) {
        console.error('Failed to ensure db_meta table exists:', error);
    }
}

/**
 * Ensure db_meta table exists and has version info
 * Call this after fresh template copy
 */
export async function initializeVersionTracking(prismaClient: any, dbType?: DatabaseType): Promise<void> {
    const currentDbType = dbType || getDatabaseType();

    try {
        if (currentDbType === 'mysql') {
            await prismaClient.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS db_meta (
                    \`key\` VARCHAR(255) PRIMARY KEY NOT NULL,
                    \`value\` TEXT NOT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            await prismaClient.$executeRawUnsafe(
                "INSERT IGNORE INTO db_meta (`key`, `value`, updated_at) VALUES ('schema_version', ?, CURRENT_TIMESTAMP)",
                CURRENT_DB_VERSION
            );
        } else {
            await prismaClient.$executeRaw`
                CREATE TABLE IF NOT EXISTS "db_meta" (
                    "key" TEXT PRIMARY KEY NOT NULL,
                    "value" TEXT NOT NULL,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `;

            await prismaClient.$executeRaw`
                INSERT OR IGNORE INTO "db_meta" ("key", "value", "updated_at")
                VALUES ('schema_version', ${CURRENT_DB_VERSION}, CURRENT_TIMESTAMP)
            `;
        }
    } catch (error) {
        console.error('Failed to initialize version tracking:', error);
    }
}
