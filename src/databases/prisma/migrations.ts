/**
 * Database Migration System
 * 
 * Safe versioning & upgrade flow:
 * 1. Template DB has version embedded at build time
 * 2. User's DB has version tracked in db_meta table
 * 3. On startup: compare versions → backup → migrate → verify
 * 
 * Migration scripts are embedded in code (not file-based)
 * to work reliably in packaged Electron apps.
 */

import fs from 'fs/promises';
import path from 'path';
import { DATABASE_OFFLINE_MODE } from '../../config/db';

/**
 * Current schema version - INCREMENT THIS when schema changes
 * Format: YYYYMMDD_NN (date + sequence number)
 */
export const CURRENT_DB_VERSION = '20260108_01';

/**
 * Minimum supported version for migration (older versions require fresh install)
 */
export const MIN_MIGRATABLE_VERSION = '20250101_01';

/**
 * Database type detection
 */
export type DatabaseType = 'sqlite' | 'mysql';

/**
 * Get the current database type based on configuration
 */
export const getDatabaseType = (): DatabaseType => {
    // If offline mode is forced, use SQLite
    if (DATABASE_OFFLINE_MODE) {
        return 'sqlite';
    }
    // Default to MySQL when not in offline mode (server mode)
    return 'mysql';
};

/**
 * Migration definition with database-specific SQL
 */
export interface Migration {
    version: string;
    description: string;
    up: string[] | { sqlite: string[]; mysql: string[] };      // SQL statements to upgrade
    down?: string[] | { sqlite: string[]; mysql: string[] };   // SQL statements to rollback (optional)
}

/**
 * Get SQL statements for the current database type
 */
const getSqlStatements = (sql: string[] | { sqlite: string[]; mysql: string[] }, dbType: DatabaseType): string[] => {
    if (Array.isArray(sql)) {
        return sql;
    }
    return sql[dbType] || [];
};

/**
 * All migrations in order (oldest to newest)
 * 
 * IMPORTANT: Never modify existing migrations once released!
 * Only add new migrations at the end.
 */
export const MIGRATIONS: Migration[] = [
    {
        version: '20250101_01',
        description: 'Initial schema - baseline version',
        up: [
            // This is the baseline - no SQL needed if starting fresh
            // The template.db already has all tables
        ],
    },
    {
        version: '20260108_01',
        description: 'Add db_meta table for version tracking',
        up: {
            sqlite: [
                `CREATE TABLE IF NOT EXISTS "db_meta" (
                    "key" TEXT PRIMARY KEY NOT NULL,
                    "value" TEXT NOT NULL,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `INSERT OR IGNORE INTO "db_meta" ("key", "value", "updated_at") 
                 VALUES ('schema_version', '20260108_01', CURRENT_TIMESTAMP)`,
            ],
            mysql: [
                `CREATE TABLE IF NOT EXISTS db_meta (
                    \`key\` VARCHAR(255) PRIMARY KEY NOT NULL,
                    \`value\` TEXT NOT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )`,
                `INSERT IGNORE INTO db_meta (\`key\`, \`value\`, updated_at) 
                 VALUES ('schema_version', '20260108_01', CURRENT_TIMESTAMP)`,
            ],
        },
        down: {
            sqlite: [`DROP TABLE IF EXISTS "db_meta"`],
            mysql: [`DROP TABLE IF EXISTS db_meta`],
        },
    },
    // Add future migrations here:
    // {
    //     version: '20260201_01',
    //     description: 'Add new_column to products table',
    //     up: {
    //         sqlite: [`ALTER TABLE "products" ADD COLUMN "new_column" TEXT DEFAULT NULL`],
    //         mysql: [`ALTER TABLE products ADD COLUMN new_column TEXT DEFAULT NULL`],
    //     },
    //     down: {
    //         sqlite: [],  // SQLite doesn't support DROP COLUMN easily
    //         mysql: [`ALTER TABLE products DROP COLUMN new_column`],
    //     },
    // },
];

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

        if (!currentVersion) {
            // Return all migrations
            return MIGRATIONS;
        }

        // Return migrations newer than current version
        return MIGRATIONS.filter(m => m.version > currentVersion);
    }

    /**
     * Create a backup of the database before migration
     */
    async createBackup(dbPath: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.userDataPath, 'backups');
        const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

        await fs.mkdir(backupDir, { recursive: true });
        await fs.copyFile(dbPath, backupPath);

        console.log(`📦 Database backup created: ${backupPath}`);
        return backupPath;
    }

    /**
     * Restore database from backup
     */
    async restoreBackup(backupPath: string, dbPath: string): Promise<void> {
        await fs.copyFile(backupPath, dbPath);
        console.log(`✓ Database restored from backup`);
    }

    /**
     * Run all pending migrations
     */
    async migrate(dbPath: string): Promise<{
        success: boolean;
        migrationsApplied: string[];
        error?: string;
        backupPath?: string;
    }> {
        const pendingMigrations = await this.getPendingMigrations();

        if (pendingMigrations.length === 0) {
            return { success: true, migrationsApplied: [] };
        }

        console.log(`\n📊 Database Migration`);
        console.log(`   Current version: ${await this.getCurrentVersion() || 'unknown'}`);
        console.log(`   Target version: ${CURRENT_DB_VERSION}`);
        console.log(`   Pending migrations: ${pendingMigrations.length}\n`);

        // Create backup before migration
        let backupPath: string | undefined;
        try {
            backupPath = await this.createBackup(dbPath);
        } catch (backupError) {
            console.error('⚠️ Failed to create backup, proceeding anyway...');
        }

        const migrationsApplied: string[] = [];

        for (const migration of pendingMigrations) {
            console.log(`🔄 Applying migration ${migration.version}: ${migration.description}`);

            try {
                // Get database-specific SQL statements
                const sqlStatements = getSqlStatements(migration.up, this.dbType);
                
                // Run each SQL statement in the migration
                for (const sql of sqlStatements) {
                    if (sql.trim()) {
                        await this.db.$executeRawUnsafe(sql);
                    }
                }

                // Update version after successful migration
                await this.setVersion(migration.version);
                migrationsApplied.push(migration.version);
                console.log(`   ✓ Migration ${migration.version} applied`);
            } catch (error) {
                const errorMessage = (error as Error).message;
                console.error(`   ❌ Migration ${migration.version} failed: ${errorMessage}`);

                // Attempt rollback to backup
                if (backupPath) {
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
     * Verify database integrity after migration
     */
    async verifyIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
        const issues: string[] = [];

        try {
            // Check database integrity (SQLite-specific, skip for MySQL)
            if (this.dbType === 'sqlite') {
                const integrityCheck = await this.db.$queryRaw`PRAGMA integrity_check`;
                if (integrityCheck?.[0]?.integrity_check !== 'ok') {
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

            // Verify version is current
            const version = await this.getCurrentVersion();
            if (version !== CURRENT_DB_VERSION) {
                issues.push(`Version mismatch: expected ${CURRENT_DB_VERSION}, got ${version}`);
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
            const files = await fs.readdir(backupDir);
            const backupFiles = files
                .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
                .sort()
                .reverse(); // Newest first

            // Delete old backups
            const filesToDelete = backupFiles.slice(keepCount);
            for (const file of filesToDelete) {
                await fs.unlink(path.join(backupDir, file));
                console.log(`🗑️ Deleted old backup: ${file}`);
            }
        } catch {
            // Backup directory may not exist
        }
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
            // MySQL syntax
            await prismaClient.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS db_meta (
                    \`key\` VARCHAR(255) PRIMARY KEY NOT NULL,
                    \`value\` TEXT NOT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // Set initial version using REPLACE for MySQL
            await prismaClient.$executeRawUnsafe(
                "INSERT IGNORE INTO db_meta (`key`, `value`, updated_at) VALUES ('schema_version', ?, CURRENT_TIMESTAMP)",
                CURRENT_DB_VERSION
            );
        } else {
            // SQLite syntax
            await prismaClient.$executeRaw`
                CREATE TABLE IF NOT EXISTS "db_meta" (
                    "key" TEXT PRIMARY KEY NOT NULL,
                    "value" TEXT NOT NULL,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Set initial version
            await prismaClient.$executeRaw`
                INSERT OR IGNORE INTO "db_meta" ("key", "value", "updated_at")
                VALUES ('schema_version', ${CURRENT_DB_VERSION}, CURRENT_TIMESTAMP)
            `;
        }
    } catch (error) {
        console.error('Failed to initialize version tracking:', error);
    }
}
