import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { setDatabaseReady, isDatabaseReady } from './client';
import { MigrationManager, CURRENT_DB_VERSION, initializeVersionTracking, getDatabaseType } from './migrations';

/**
 * Template database filename - created at build time with all tables ready.
 * This file is copied to the user's data directory on first run.
 */
const TEMPLATE_DB_NAME = 'template.db';

/**
 * Database initializer for production-safe database setup.
 * 
 * Production-safe approach:
 * - Prisma schema & migrations are BUILD-TIME only
 * - Runtime only copies a ready template database
 * - No Prisma CLI, no execSync, no runtime code generation
 * - Works in packaged Electron apps (asar)
 * 
 * Versioning & Upgrade flow:
 * 1. Fresh install → copy template.db (has current version)
 * 2. Existing DB → check version → backup → migrate if needed
 * 
 * IMPORTANT: This class MUST be called before any Prisma operations.
 * It ensures the database file exists before allowing Prisma to open it.
 */
export class DatabaseInitializer {
    private static userDataPath: string;
    private static targetDbPath: string;
    private static migrationManager: MigrationManager | null = null;

    /**
     * Ensures the database is ready for use.
     * This MUST be called before any Prisma operations.
     * 
     * @param userDataPath - Path to user data directory (e.g., app.getPath('userData') in Electron)
     * @returns true if database is ready, false otherwise
     */
    static async ensureReady(userDataPath?: string): Promise<boolean> {
        // If already verified, skip
        if (isDatabaseReady()) {
            return true;
        }

        const dbType = getDatabaseType();
        
        // For MySQL mode (server/online), handle differently
        if (dbType === 'mysql') {
            return this.ensureReadyForMySQL(userDataPath);
        }

        // SQLite mode (Electron/offline)
        return this.ensureReadyForSQLite(userDataPath);
    }

    /**
     * Ensure MySQL database is ready (server mode)
     */
    private static async ensureReadyForMySQL(userDataPath?: string): Promise<boolean> {
        this.userDataPath = userDataPath || this.resolveDefaultDataPath();

        try {
            // Mark database as ready - MySQL doesn't need file verification
            setDatabaseReady();

            // Import Prisma client
            const { default: prisma } = await import('./client');

            // Initialize version tracking for MySQL
            await initializeVersionTracking(prisma, 'mysql');

            // Check for and run migrations if needed
            this.migrationManager = new MigrationManager(prisma, this.userDataPath, 'mysql');

            if (await this.migrationManager.needsMigration()) {
                // For MySQL, we don't do file-based backup/restore
                // Just run the migrations
                const pendingMigrations = await this.migrationManager.getPendingMigrations();
                
                console.log(`\n📊 Database Migration (MySQL)`);
                console.log(`   Current version: ${await this.migrationManager.getCurrentVersion() || 'unknown'}`);
                console.log(`   Target version: ${CURRENT_DB_VERSION}`);
                console.log(`   Pending migrations: ${pendingMigrations.length}\n`);

                for (const migration of pendingMigrations) {
                    console.log(`🔄 Applying migration ${migration.version}: ${migration.description}`);
                    try {
                        // Get MySQL-specific SQL statements
                        const sqlStatements = Array.isArray(migration.up) 
                            ? migration.up 
                            : migration.up.mysql || [];
                        
                        for (const sql of sqlStatements) {
                            if (sql.trim()) {
                                await prisma.$executeRawUnsafe(sql);
                            }
                        }
                        
                        // Update version using MySQL syntax
                        await prisma.$executeRawUnsafe(
                            "REPLACE INTO db_meta (`key`, `value`, updated_at) VALUES ('schema_version', ?, CURRENT_TIMESTAMP)",
                            migration.version
                        );
                        console.log(`   ✓ Migration ${migration.version} applied`);
                    } catch (error) {
                        console.error(`   ❌ Migration ${migration.version} failed:`, (error as Error).message);
                        return false;
                    }
                }

                if (pendingMigrations.length > 0) {
                    console.log(`\n✓ All migrations applied successfully`);
                    console.log(`   New version: ${CURRENT_DB_VERSION}\n`);
                }
            }

            console.log(`✓ Database ready (version: ${CURRENT_DB_VERSION})\n`);
            return true;
        } catch (error) {
            console.error('\n❌ Failed to setup MySQL database:', (error as Error).message);
            return false;
        }
    }

    /**
     * Ensure SQLite database is ready (Electron/offline mode)
     */
    private static async ensureReadyForSQLite(userDataPath?: string): Promise<boolean> {
        this.userDataPath = userDataPath || this.resolveDefaultDataPath();
        this.targetDbPath = this.getTargetDatabasePath();

        try {
            // Step 1: Check if database file exists
            const dbExists = await this.databaseFileExists();
            let isFreshInstall = false;

            if (!dbExists) {
                console.log('📦 First-time database setup...');
                isFreshInstall = true;

                // Step 2: Copy the template database (created at build time)
                await this.copyTemplateDatabase();
            }

            // Step 3: Verify the database file is complete (not empty/corrupted)
            const isValid = await this.verifyDatabaseFile();
            if (!isValid) {
                console.error('❌ Database file exists but appears invalid');
                // Try to recover by copying template again
                await this.copyTemplateDatabase();
                isFreshInstall = true;
            }

            // Step 4: Mark database as ready - this allows Prisma to connect
            const dbUrl = `file:${this.targetDbPath}`;
            setDatabaseReady(dbUrl);

            // Step 5: Import Prisma now that DB is ready
            const { default: prisma } = await import('./client');

            // Step 6: Initialize version tracking (for fresh install or old DB)
            if (isFreshInstall) {
                await initializeVersionTracking(prisma, 'sqlite');
            }

            // Step 7: Check for and run migrations if needed
            this.migrationManager = new MigrationManager(prisma, this.userDataPath, 'sqlite');

            if (await this.migrationManager.needsMigration()) {
                const result = await this.migrationManager.migrate(this.targetDbPath);

                if (!result.success) {
                    console.error('❌ Migration failed:', result.error);
                    return false;
                }
            }

            // Step 8: Verify database integrity
            const integrity = await this.migrationManager.verifyIntegrity();
            if (!integrity.valid) {
                console.warn('⚠️ Database integrity issues:', integrity.issues);
            }

            // Step 9: Cleanup old backups
            await this.migrationManager.cleanupOldBackups(5);

            // Step 10: Final verification - check tables exist
            await prisma.$queryRaw`SELECT 1 FROM app_setups LIMIT 1`;

            console.log(`✓ Database ready (version: ${CURRENT_DB_VERSION})\n`);
            return true;
        } catch (error) {
            const errorMessage = (error as Error)?.message || '';

            // Check if this is a "table does not exist" error (corrupt/incomplete db)
            if (errorMessage.includes('no such table') ||
                errorMessage.includes('does not exist') ||
                errorMessage.includes('SQLITE_ERROR')) {

                console.error('❌ Database file is missing tables, attempting recovery...');

                try {
                    // Remove the bad file and copy template again
                    try {
                        await fs.unlink(this.targetDbPath);
                    } catch {
                        // File may not exist, ignore
                    }
                    await this.copyTemplateDatabase();

                    const dbUrl = `file:${this.targetDbPath}`;
                    setDatabaseReady(dbUrl);

                    console.log('✓ Database recovered\n');
                    return true;
                } catch (recoveryError) {
                    console.error('❌ Recovery failed:', (recoveryError as Error).message);
                }
            }

            console.error('\n❌ Failed to setup database:', (error as Error).message);
            console.log('\n📝 Troubleshooting:');
            console.log('   1. Ensure the template database exists (run: npm run db:build-template)');
            console.log('   2. Ensure the data directory is writable');
            console.log(`   3. Data path: ${this.userDataPath}\n`);
            return false;
        }
    }

    /**
     * Check if the target database file exists
     */
    private static async databaseFileExists(): Promise<boolean> {
        try {
            await fs.access(this.targetDbPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Verify the database file is valid (not empty, has expected size)
     */
    private static async verifyDatabaseFile(): Promise<boolean> {
        try {
            const stats = await fs.stat(this.targetDbPath);

            // SQLite database files have a minimum size (header is 100 bytes)
            // A valid database with tables should be at least a few KB
            const MIN_VALID_SIZE = 4096; // 4KB minimum for a database with tables

            if (stats.size < MIN_VALID_SIZE) {
                console.warn(`⚠️ Database file too small (${stats.size} bytes), may be corrupt`);
                return false;
            }

            // Check SQLite magic header
            const fd = await fs.open(this.targetDbPath, 'r');
            const buffer = Buffer.alloc(16);
            await fd.read(buffer, 0, 16, 0);
            await fd.close();

            const header = buffer.toString('utf8', 0, 16);
            if (!header.startsWith('SQLite format 3')) {
                console.warn('⚠️ Database file has invalid SQLite header');
                return false;
            }

            return true;
        } catch (error) {
            console.warn('⚠️ Could not verify database file:', (error as Error).message);
            return false;
        }
    }

    /**
     * Resolves the default data path based on the runtime environment.
     */
    private static resolveDefaultDataPath(): string {
        // Try to detect Electron's app.getPath('userData')
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const electron = eval('require')('electron') as { app?: { getPath?: (name: string) => string } };
            if (electron?.app?.getPath) {
                return electron.app.getPath('userData');
            }
        } catch {
            // Not in Electron
        }

        // Fallback: platform-specific app data directory
        const appName = 'zonse247-pos';
        const platform = os.platform();

        let basePath: string;
        switch (platform) {
            case 'win32':
                basePath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
                break;
            case 'darwin':
                basePath = path.join(os.homedir(), 'Library', 'Application Support');
                break;
            default:
                basePath = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        }

        return path.join(basePath, appName);
    }

    /**
     * Copies the pre-built template database to the user's data directory.
     * 
     * The template database is created at BUILD TIME using:
     *   npm run db:build-template
     * 
     * This creates all tables via Prisma migrations, then the .db file
     * is shipped with the package and copied on first run.
     */
    private static async copyTemplateDatabase(): Promise<void> {
        // Find the template database from known locations
        const templatePath = await this.findTemplateDatabase();

        if (!templatePath) {
            throw new Error(
                `Template database (${TEMPLATE_DB_NAME}) not found. ` +
                'Run "npm run db:build-template" during build to create it.'
            );
        }

        const targetDir = path.dirname(this.targetDbPath);

        // Ensure target directory exists
        await fs.mkdir(targetDir, { recursive: true });

        // Copy template to target
        console.log(`📂 Copying template database...`);
        console.log(`   From: ${templatePath}`);
        console.log(`   To: ${this.targetDbPath}`);

        await fs.copyFile(templatePath, this.targetDbPath);

        // Set appropriate permissions (read/write for owner only)
        try {
            await fs.chmod(this.targetDbPath, 0o600);
        } catch {
            // chmod may fail on Windows, that's OK
        }

        console.log('✓ Template database copied successfully');
    }

    /**
     * Finds the template database from known locations.
     * Handles: development, installed package, and packaged Electron app.
     */
    private static async findTemplateDatabase(): Promise<string | null> {
        // Type assertion for Electron's process.resourcesPath
        const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath || '';

        const possiblePaths = [
            // Development: relative to this file in dist
            path.join(__dirname, '..', TEMPLATE_DB_NAME),
            // Development: relative to compiled service
            path.join(__dirname, '../databases', TEMPLATE_DB_NAME),
            // Development: from src
            path.join(__dirname, '../../databases', TEMPLATE_DB_NAME),
            // Installed as npm package
            path.join(process.cwd(), 'node_modules/zonse247-pos-api/dist/databases', TEMPLATE_DB_NAME),
            // Electron packaged: resources directory (extraResources)
            path.join(resourcesPath, TEMPLATE_DB_NAME),
            // Electron packaged: app.asar.unpacked
            path.join(resourcesPath, 'app.asar.unpacked/dist/databases', TEMPLATE_DB_NAME),
        ];

        for (const templatePath of possiblePaths) {
            try {
                await fs.access(templatePath);
                return templatePath;
            } catch {
                // Continue searching
            }
        }

        return null;
    }

    /**
     * Gets the target database path based on DATABASE_URL or default location.
     */
    private static getTargetDatabasePath(): string {
        const dbUrl = process.env.DATABASE_URL || '';

        // Parse file: URL if present
        if (dbUrl.startsWith('file:')) {
            const filePath = dbUrl.replace('file:', '');
            // Handle relative paths
            if (!path.isAbsolute(filePath)) {
                return path.join(this.userDataPath, filePath);
            }
            return filePath;
        }

        // Default database location
        return path.join(this.userDataPath, 'local.db');
    }

    /**
     * Get the current user data path
     */
    static getUserDataPath(): string {
        return this.userDataPath || this.resolveDefaultDataPath();
    }

    /**
     * Get database status information (useful for UI/debugging)
     */
    static async getStatus(): Promise<{
        initialized: boolean;
        version: string | null;
        targetVersion: string;
        needsMigration: boolean;
        dbPath: string;
        backupsPath: string;
    }> {
        const initialized = isDatabaseReady();
        let version: string | null = null;
        let needsMigration = false;

        if (initialized && this.migrationManager) {
            version = await this.migrationManager.getCurrentVersion();
            needsMigration = await this.migrationManager.needsMigration();
        }

        return {
            initialized,
            version,
            targetVersion: CURRENT_DB_VERSION,
            needsMigration,
            dbPath: this.targetDbPath || 'not set',
            backupsPath: path.join(this.userDataPath || '', 'backups'),
        };
    }

    /**
     * Force a migration check and run (for manual upgrade trigger)
     */
    static async runMigrations(): Promise<{
        success: boolean;
        migrationsApplied: string[];
        error?: string;
    }> {
        if (!isDatabaseReady() || !this.migrationManager) {
            return {
                success: false,
                migrationsApplied: [],
                error: 'Database not initialized. Call ensureReady() first.',
            };
        }

        return this.migrationManager.migrate(this.targetDbPath);
    }

    /**
     * Get the migration manager instance
     */
    static getMigrationManager(): MigrationManager | null {
        return this.migrationManager;
    }
}
