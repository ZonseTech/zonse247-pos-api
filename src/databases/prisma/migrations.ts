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
import { getDatabaseConfig } from '../../config/db';

/**
 * Current schema version - INCREMENT THIS when schema changes
 * Format: YYYYMMDD_NN (date + sequence number)
 */
export const CURRENT_DB_VERSION = '20260120_02';

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
    const config = getDatabaseConfig()

    return config.provider as unknown as DatabaseType;
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
    {
        version: '20260110_01',
        description: 'Add tenant_registration_details table for storing temporary registration info',
        up: {
            sqlite: [
                `CREATE TABLE IF NOT EXISTS "tenant_registration_details" (
                    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                    "detail_id" TEXT NOT NULL UNIQUE,
                    "tenant_id" TEXT NOT NULL,
                    "business_name" TEXT NOT NULL,
                    "owner_name" TEXT NOT NULL,
                    "email" TEXT NOT NULL,
                    "tenant_code" TEXT NOT NULL,
                    "verification_token" TEXT NOT NULL,
                    "username" TEXT NOT NULL,
                    "password" TEXT NOT NULL,
                    "is_processed" INTEGER NOT NULL DEFAULT 0,
                    "processed_at" DATETIME,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_tenant_registration_details_tenant_id" ON "tenant_registration_details" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_tenant_registration_details_email" ON "tenant_registration_details" ("email")`,
                `CREATE INDEX IF NOT EXISTS "idx_tenant_registration_details_is_processed" ON "tenant_registration_details" ("is_processed")`,
            ],
            mysql: [
                `CREATE TABLE IF NOT EXISTS tenant_registration_details (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    detail_id VARCHAR(255) NOT NULL UNIQUE,
                    tenant_id VARCHAR(255) NOT NULL,
                    business_name VARCHAR(255) NOT NULL,
                    owner_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    tenant_code VARCHAR(255) NOT NULL,
                    verification_token TEXT NOT NULL,
                    username VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
                    processed_at DATETIME,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_tenant_id (tenant_id),
                    INDEX idx_email (email),
                    INDEX idx_is_processed (is_processed)
                )`,
            ],
        },
        down: {
            sqlite: [`DROP TABLE IF EXISTS "tenant_registration_details"`],
            mysql: [`DROP TABLE IF EXISTS tenant_registration_details`],
        },
    },
    {
        version: '20260120_01',
        description: 'Add SalePayment table for multiple payment method support',
        up: {
            sqlite: [
                `CREATE TABLE IF NOT EXISTS "sale_payments" (
                    "sale_payment_id" TEXT PRIMARY KEY NOT NULL,
                    "sale_id" TEXT NOT NULL,
                    "payment_method_id" TEXT NOT NULL,
                    "amount" REAL NOT NULL,
                    "reference" TEXT,
                    "provider_id" TEXT,
                    "provider_ref" TEXT,
                    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
                    "processed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "notes" TEXT,
                    "synced" INTEGER NOT NULL DEFAULT 0,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("sale_id") REFERENCES "sales"("sale_id") ON DELETE CASCADE,
                    FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("method_id") ON DELETE RESTRICT
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_sale_payments_sale_id" ON "sale_payments" ("sale_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_sale_payments_payment_method_id" ON "sale_payments" ("payment_method_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_sale_payments_status" ON "sale_payments" ("status")`,
                `CREATE INDEX IF NOT EXISTS "idx_sale_payments_processed_at" ON "sale_payments" ("processed_at")`,
            ],
            mysql: [
                `CREATE TABLE IF NOT EXISTS sale_payments (
                    sale_payment_id VARCHAR(255) PRIMARY KEY NOT NULL,
                    sale_id VARCHAR(255) NOT NULL,
                    payment_method_id VARCHAR(255) NOT NULL,
                    amount DOUBLE NOT NULL,
                    reference VARCHAR(255),
                    provider_id VARCHAR(255),
                    provider_ref VARCHAR(255),
                    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
                    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT,
                    synced TINYINT NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
                    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(method_id) ON DELETE RESTRICT,
                    INDEX idx_sale_id (sale_id),
                    INDEX idx_payment_method_id (payment_method_id),
                    INDEX idx_status (status),
                    INDEX idx_processed_at (processed_at)
                )`,
            ],
        },
        down: {
            sqlite: [`DROP TABLE IF EXISTS "sale_payments"`],
            mysql: [`DROP TABLE IF EXISTS sale_payments`],
        },
    },
    {
        version: '20260120_02',
        description: 'Add ParkedSale and ParkedSaleItem tables for parked/held sales',
        up: {
            sqlite: [
                // ParkedSale table
                `CREATE TABLE IF NOT EXISTS "parked_sales" (
                    "parked_sale_id" TEXT PRIMARY KEY NOT NULL,
                    "tenant_id" TEXT NOT NULL,
                    "branch_id" TEXT NOT NULL,
                    "user_id" TEXT NOT NULL,
                    "terminal_id" TEXT,
                    "customer_id" TEXT,
                    "reference" TEXT NOT NULL UNIQUE,
                    "subtotal" REAL NOT NULL DEFAULT 0,
                    "tax_amount" REAL NOT NULL DEFAULT 0,
                    "discount_amount" REAL NOT NULL DEFAULT 0,
                    "total_amount" REAL NOT NULL DEFAULT 0,
                    "total_items" INTEGER NOT NULL DEFAULT 0,
                    "status" TEXT NOT NULL DEFAULT 'PARKED',
                    "notes" TEXT,
                    "parked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "expires_at" DATETIME,
                    "resumed_at" DATETIME,
                    "synced" INTEGER NOT NULL DEFAULT 0,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_tenant_id" ON "parked_sales" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_branch_id" ON "parked_sales" ("branch_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_user_id" ON "parked_sales" ("user_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_terminal_id" ON "parked_sales" ("terminal_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_reference" ON "parked_sales" ("reference")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_status" ON "parked_sales" ("status")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_parked_at" ON "parked_sales" ("parked_at")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_created_at" ON "parked_sales" ("created_at")`,
                // ParkedSaleItem table
                `CREATE TABLE IF NOT EXISTS "parked_sale_items" (
                    "parked_sale_item_id" TEXT PRIMARY KEY NOT NULL,
                    "parked_sale_id" TEXT NOT NULL,
                    "product_id" TEXT NOT NULL,
                    "category_id" TEXT,
                    "name" TEXT NOT NULL,
                    "barcode" TEXT,
                    "sku" TEXT,
                    "unit" TEXT,
                    "quantity" INTEGER NOT NULL DEFAULT 1,
                    "unit_price" REAL NOT NULL DEFAULT 0,
                    "sell_price" REAL NOT NULL DEFAULT 0,
                    "purchase_price" REAL NOT NULL DEFAULT 0,
                    "discount" REAL NOT NULL DEFAULT 0,
                    "tax_amount" REAL NOT NULL DEFAULT 0,
                    "subtotal" REAL NOT NULL DEFAULT 0,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("parked_sale_id") REFERENCES "parked_sales"("parked_sale_id") ON DELETE CASCADE
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sale_items_parked_sale_id" ON "parked_sale_items" ("parked_sale_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sale_items_product_id" ON "parked_sale_items" ("product_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sale_items_category_id" ON "parked_sale_items" ("category_id")`,
            ],
            mysql: [
                // ParkedSale table
                `CREATE TABLE IF NOT EXISTS parked_sales (
                    parked_sale_id VARCHAR(255) PRIMARY KEY NOT NULL,
                    tenant_id VARCHAR(255) NOT NULL,
                    branch_id VARCHAR(255) NOT NULL,
                    user_id VARCHAR(255) NOT NULL,
                    terminal_id VARCHAR(255),
                    customer_id VARCHAR(255),
                    reference VARCHAR(255) NOT NULL UNIQUE,
                    subtotal DOUBLE NOT NULL DEFAULT 0,
                    tax_amount DOUBLE NOT NULL DEFAULT 0,
                    discount_amount DOUBLE NOT NULL DEFAULT 0,
                    total_amount DOUBLE NOT NULL DEFAULT 0,
                    total_items INT NOT NULL DEFAULT 0,
                    status VARCHAR(50) NOT NULL DEFAULT 'PARKED',
                    notes TEXT,
                    parked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    resumed_at DATETIME,
                    synced TINYINT NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_tenant_id (tenant_id),
                    INDEX idx_branch_id (branch_id),
                    INDEX idx_user_id (user_id),
                    INDEX idx_terminal_id (terminal_id),
                    INDEX idx_reference (reference),
                    INDEX idx_status (status),
                    INDEX idx_parked_at (parked_at),
                    INDEX idx_created_at (created_at)
                )`,
                // ParkedSaleItem table
                `CREATE TABLE IF NOT EXISTS parked_sale_items (
                    parked_sale_item_id VARCHAR(255) PRIMARY KEY NOT NULL,
                    parked_sale_id VARCHAR(255) NOT NULL,
                    product_id VARCHAR(255) NOT NULL,
                    category_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    barcode VARCHAR(255),
                    sku VARCHAR(255),
                    unit VARCHAR(50),
                    quantity INT NOT NULL DEFAULT 1,
                    unit_price DOUBLE NOT NULL DEFAULT 0,
                    sell_price DOUBLE NOT NULL DEFAULT 0,
                    purchase_price DOUBLE NOT NULL DEFAULT 0,
                    discount DOUBLE NOT NULL DEFAULT 0,
                    tax_amount DOUBLE NOT NULL DEFAULT 0,
                    subtotal DOUBLE NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parked_sale_id) REFERENCES parked_sales(parked_sale_id) ON DELETE CASCADE,
                    INDEX idx_parked_sale_id (parked_sale_id),
                    INDEX idx_product_id (product_id),
                    INDEX idx_category_id (category_id)
                )`,
            ],
        },
        down: {
            sqlite: [
                `DROP TABLE IF EXISTS "parked_sale_items"`,
                `DROP TABLE IF EXISTS "parked_sales"`,
            ],
            mysql: [
                `DROP TABLE IF EXISTS parked_sale_items`,
                `DROP TABLE IF EXISTS parked_sales`,
            ],
        },
    },
    // Add future migrations here:
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
     * @param dbPath - Path to database file (required for SQLite backups, optional for MySQL)
     */
    async migrate(dbPath?: string): Promise<{
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

        // Create backup before migration (SQLite only)
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

                // Attempt rollback to backup (SQLite only)
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
