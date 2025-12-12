import os from 'os';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import prisma from '../databases/prisma/client';
import { NodeStorageAdapter } from '../lib/security-adapter.lib';
import type { EncryptionResult, SetupParams, StorageAdapter } from 'security';

export class SecureSettingsService {
    private static initialized = false;
    private static readonly KEY_LENGTH = 32;
    private static readonly IV_LENGTH = 16;
    private static readonly AUTH_TAG_LENGTH = 16;
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static encryptionKey: Buffer | null = null;
    private static storageAdapter: StorageAdapter;

    static async initialize(storagePath = ''): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            this.storageAdapter = new NodeStorageAdapter(path.join(__dirname, '../.secure-data'));

            const dataPath = storagePath || this.storageAdapter.getUserDataPath();
            await fs.mkdir(dataPath, { recursive: true });

            await this.ensureDatabaseReady();

            const keyPath = path.join(dataPath, '.keystore');

            try {
                const existingKey = await fs.readFile(keyPath);
                this.encryptionKey = existingKey;
                console.log('Encryption key loaded from keystore');
            } catch (error) {
                console.log('Generating new encryption key...');
                const machineId = await this.getMachineId();
                const appSalt = 'pos-terminal-seal-app-v1';

                this.encryptionKey = crypto.pbkdf2Sync(
                    machineId,
                    appSalt,
                    100000,
                    this.KEY_LENGTH,
                    'sha256'
                );

                await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
                console.log('New encryption key generated and stored');
            }

            this.initialized = true;
        } catch (error) {
            console.error('Error initializing encryption:', error);
            throw new Error('Failed to initialize encryption');
        }
    }

    private static async getMachineId(): Promise<string> {
        const identifiers = [
            os.hostname(),
            os.platform(),
            os.arch(),
            os.cpus()[0]?.model || 'unknown',
        ].join('|');

        return identifiers;
    }

    private static encrypt(text: string): EncryptionResult {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        const iv = crypto.randomBytes(this.IV_LENGTH);
        const cipher = crypto.createCipheriv(this.ALGORITHM, this.encryptionKey, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        return {
            encrypted: encrypted + authTag.toString('hex'),
            iv: iv.toString('hex'),
        };
    }

    private static decrypt(encrypted: string, ivHex: string): string {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const encryptedData = encrypted.slice(0, -this.AUTH_TAG_LENGTH * 2);
        const authTag = Buffer.from(encrypted.slice(-this.AUTH_TAG_LENGTH * 2), 'hex');

        const decipher = crypto.createDecipheriv(this.ALGORITHM, this.encryptionKey, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    private static createDataSignature(
        verificationToken: string,
        tenantId: string,
        branchId: string,
        terminalId: string
    ): string {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        const dataString = `${verificationToken}|${tenantId}|${branchId}|${terminalId}`;
        const hmac = crypto.createHmac('sha256', this.encryptionKey);
        hmac.update(dataString);
        return hmac.digest('hex');
    }

    static async saveAppSetup(params: SetupParams): Promise<void> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const { encrypted, iv } = this.encrypt(params.verificationToken);

            const signature = this.createDataSignature(
                params.verificationToken,
                params.tenantId,
                params.branchId,
                params.terminalId
            );

            const now = new Date();

            await prisma.appSetup.upsert({
                where: { setupId: '-1' },
                update: {
                    tenantId: params.tenantId,
                    branchId: params.branchId,
                    terminalId: params.terminalId,
                    encryptedVerificationToken: encrypted,
                    iv: iv,
                    dataSignature: signature,
                    updatedAt: now,
                },
                create: {
                    setupId: '-1',
                    tenantId: params.tenantId,
                    branchId: params.branchId,
                    terminalId: params.terminalId,
                    encryptedVerificationToken: encrypted,
                    iv: iv,
                    dataSignature: signature,
                    createdAt: now,
                    updatedAt: now,
                }
            });
        } catch (error) {
            console.error('Error saving app setup:', error);
            throw error;
        }
    }

    static async getAppSetup(): Promise<SetupParams | null> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const encryptedSetup = await prisma.appSetup.findUnique({
                where: { setupId: '-1' }
            });

            if (!encryptedSetup) {
                return null;
            }

            const verificationToken = this.decrypt(
                encryptedSetup.encryptedVerificationToken,
                encryptedSetup.iv
            );

            const expectedSignature = this.createDataSignature(
                verificationToken,
                encryptedSetup.tenantId,
                encryptedSetup.branchId,
                encryptedSetup.terminalId
            );

            if (encryptedSetup.dataSignature !== expectedSignature) {
                console.warn('Data signature mismatch - data may be tampered');
            }

            return {
                setupId: encryptedSetup.setupId,
                tenantId: encryptedSetup.tenantId,
                branchId: encryptedSetup.branchId,
                terminalId: encryptedSetup.terminalId,
                verificationToken: verificationToken,
                tenantSignature: encryptedSetup.dataSignature,
                createdAt: encryptedSetup.createdAt,
                updatedAt: encryptedSetup.updatedAt,
            };
        } catch (error) {
            console.error('Error getting app setup:', error);
            return null;
        }
    }

    static async hasAppSetup(): Promise<boolean> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const isReady = await this.ensureDatabaseReady();
            if (!isReady) {
                console.warn('Database not ready, returning false');
                return false;
            }

            const setup = await prisma.appSetup.findUnique({
                where: { setupId: '-1' }
            });
            return setup !== null;
        } catch (error) {
            console.error('Error checking app setup:', error);
            return false;
        }
    }

    /**
     * Ensures the database is migrated and ready for use
     * @returns true if database is ready, false otherwise
     */
    private static async ensureDatabaseReady(): Promise<boolean> {
        try {
            await prisma.$queryRaw`SELECT 1 FROM app_setups LIMIT 1`;
            return true;
        } catch (error) {
            const errorMessage = error?.message || '';

            if (errorMessage.includes('does not exist') ||
                errorMessage.includes('no such table')) {

                try {
                    const { execSync } = await import('child_process');

                    // Step 1: Locate schema.sqlite.prisma file first
                    const possibleSchemaBasePaths = [
                        path.join(__dirname, '../databases/prisma'),
                        path.join(process.cwd(), 'node_modules/zonse247-pos-api/src/databases/prisma'),
                        path.join(process.cwd(), 'src/databases/prisma')
                    ];

                    let schemaDir = '';
                    let schemaSqlitePath = '';

                    for (const basePath of possibleSchemaBasePaths) {
                        const testPath = path.join(basePath, 'schema.sqlite.prisma');
                        try {
                            await fs.access(testPath);
                            schemaSqlitePath = testPath;
                            schemaDir = basePath;
                            break;
                        } catch {
                            // Continue searching
                        }
                    }

                    if (!schemaSqlitePath || !schemaDir) {
                        throw new Error('❌ Could not locate schema.sqlite.prisma file. Please ensure it exists in the project.');
                    }

                    console.log(`📂 Found schema directory: ${schemaDir}`);

                    // Step 2: Copy schema.sqlite.prisma to schema.prisma (REQUIRED)
                    const schemaDestPath = path.join(schemaDir, 'schema.prisma');
                    const schemaPath = schemaDestPath;

                    let schemaFileReady = false;
                    try {
                        await fs.copyFile(schemaSqlitePath, schemaDestPath);
                        console.log('✅ Copied schema.sqlite.prisma to schema.prisma');
                        schemaFileReady = true;
                    } catch (err) {
                        // Check if schema.prisma already exists and is valid
                        try {
                            await fs.access(schemaDestPath);
                            console.log('ℹ️  schema.prisma already exists, skipping copy');
                            schemaFileReady = true;
                        } catch {
                            throw new Error('❌ Failed to copy schema.sqlite.prisma and schema.prisma does not exist. Cannot proceed with migration.');
                        }
                    }

                    if (!schemaFileReady) {
                        throw new Error('❌ Schema file is not ready for migration');
                    }

                    // Step 3: Copy prisma.config.ts to project root (REQUIRED)
                    const prismaConfigPath = path.join(process.cwd(), 'prisma.config.ts');
                    let configFileReady = false;

                    try {
                        await fs.access(prismaConfigPath);
                        console.log('ℹ️  prisma.config.ts already exists in project root');
                        configFileReady = true;
                    } catch {
                        // Try to copy from example or source
                        const possibleConfigPaths = [
                            path.join(process.cwd(), 'node_modules/zonse247-pos-api/src/databases/prisma/prisma.config.ts.example'),
                            path.join(process.cwd(), 'node_modules/zonse247-pos-api/prisma.config.ts'),
                            path.join(__dirname, '../databases/prisma/prisma.config.ts.example'),
                            path.join(__dirname, '../../prisma.config.ts')
                        ];

                        for (const configSource of possibleConfigPaths) {
                            try {
                                await fs.access(configSource);
                                await fs.copyFile(configSource, prismaConfigPath);
                                console.log(`✅ Copied prisma.config.ts from ${path.basename(configSource)} to project root`);
                                configFileReady = true;
                                break;
                            } catch {
                                // Try next path
                            }
                        }

                        if (!configFileReady) {
                            throw new Error('❌ prisma.config.ts not found in any expected location. Cannot proceed with migration.');
                        }
                    }

                    // Step 4: Setup migrations directory (REQUIRED)
                    const migrationsDir = path.join(schemaDir, 'migrations');
                    const migrationsSqliteDir = path.join(schemaDir, 'migrations-sqlite');
                    let migrationsReady = false;

                    try {
                        await fs.access(migrationsSqliteDir);

                        // Backup existing migrations if present
                        try {
                            await fs.access(migrationsDir);
                            const backupDir = path.join(schemaDir, `migrations-backup-${Date.now()}`);
                            await fs.rename(migrationsDir, backupDir);
                            console.log(`📦 Backed up existing migrations to ${path.basename(backupDir)}`);
                        } catch {
                            // No existing migrations to backup
                        }

                        // Rename migrations-sqlite to migrations
                        await fs.rename(migrationsSqliteDir, migrationsDir);
                        console.log('✅ Configured migrations-sqlite as active migrations directory');
                        migrationsReady = true;
                    } catch (err) {
                        // Check if migrations directory already exists
                        try {
                            await fs.access(migrationsDir);
                            console.log('ℹ️  migrations directory already exists');
                            migrationsReady = true;
                        } catch {
                            throw new Error('❌ migrations-sqlite directory not found and migrations directory does not exist. Cannot proceed with migration.');
                        }
                    }

                    if (!migrationsReady) {
                        throw new Error('❌ Migrations directory is not ready');
                    }

                    // Step 5: Verify all required files are in place
                    console.log('\n🔍 Verifying all required files...');
                    const requiredFiles = [
                        { path: schemaDestPath, name: 'schema.prisma' },
                        { path: prismaConfigPath, name: 'prisma.config.ts' },
                        { path: migrationsDir, name: 'migrations directory' }
                    ];

                    for (const file of requiredFiles) {
                        try {
                            await fs.access(file.path);
                            console.log(`  ✓ ${file.name}`);
                        } catch {
                            throw new Error(`❌ Required file missing: ${file.name} at ${file.path}`);
                        }
                    }

                    console.log('✅ All required files are in place\n');

                    // Step 6: Generate Prisma client
                    console.log('🔨 Generating Prisma client...');
                    try {
                        execSync(`npx prisma generate --schema="${schemaPath}"`, {
                            stdio: 'pipe',
                            cwd: process.cwd()
                        });
                        console.log('✅ Prisma client generated successfully');
                    } catch (genError) {
                        throw new Error(`❌ Failed to generate Prisma client: ${genError.message}`);
                    }

                    // Step 7: Run migrations
                    console.log('🚀 Running database migrations...');
                    execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
                        stdio: 'inherit',
                        cwd: process.cwd()
                    });

                    console.log('✅ Database setup completed successfully\n');
                    return true;
                } catch (migrationError) {
                    console.error('\n❌ Failed to set up database:', migrationError.message);
                    console.log('\n📝 Manual setup required:');
                    console.log('   1. Ensure schema.sqlite.prisma exists in src/databases/prisma/');
                    console.log('   2. Ensure migrations-sqlite directory exists in src/databases/prisma/');
                    console.log('   3. Ensure prisma.config.ts.example exists');
                    console.log('   4. Run: npx prisma migrate deploy');
                    console.log('   Or run: npm run db:migrate (if script exists)\n');
                    return false;
                }
            }

            console.error('❌ Database check failed:', error);
            return false;
        }
    }

    static async clearAppSetup(): Promise<void> {
        try {
            await prisma.appSetup.delete({
                where: { setupId: '-1' }
            });
            console.log('App setup cleared');
        } catch (error) {
            console.error('Error clearing app setup:', error);
            throw error;
        }
    }

    static async updateAppSetup(updates: Partial<SetupParams>): Promise<void> {
        try {
            const existing = await this.getAppSetup();
            if (!existing) {
                throw new Error('No existing setup found');
            }

            const updated = {
                ...existing,
                ...updates,
            };

            await this.saveAppSetup(updated);
        } catch (error) {
            console.error('Error updating app setup:', error);
            throw error;
        }
    }

    static async getTenantSignature(): Promise<string | null> {
        try {
            const setup = await this.getAppSetup();
            return setup?.tenantSignature || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Verify if a received signature matches the expected signature for the current setup
     * @param receivedSignature - The signature received from the client (x-tenant-signature header)
     * @returns Object with verification result and setup data if valid
     */
    static async verifyTenantSignature(receivedSignature: string): Promise<{
        isValid: boolean;
        tenantId?: string;
        branchId?: string;
        terminalId?: string;
        verificationToken?: string;
        error?: string;
    }> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const setup = await this.getAppSetup();

            if (!setup) {
                return { isValid: false };
            }

            const isValid = receivedSignature === setup.tenantSignature;

            if (isValid) {
                return {
                    isValid: true,
                    tenantId: setup.tenantId,
                    branchId: setup.branchId,
                    terminalId: setup.terminalId,
                    verificationToken: setup.verificationToken
                };
            }

            return { isValid: false };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }

    /**
     * Encrypt a tenantId and return the encrypted string
     * @param tenantId - The plain tenant ID to encrypt (e.g., 'tenant-456')
     * @returns The encrypted tenant ID string (e.g., '70610b28-c886-4647-acb5-d7565883545f')
     */
    static async encryptTenantId(tenantId: string): Promise<string> {
        if (!this.initialized) {
            await this.initialize();
        }

        const { encrypted, iv } = this.encrypt(tenantId);

        const encryptedString = `${encrypted}:${iv}`;

        return encryptedString;
    }

    /**
     * Decrypt an encrypted tenantId string
     * @param encryptedTenantId - The encrypted tenant ID (e.g., '70610b28-c886-4647-acb5-d7565883545f')
     * @returns Object containing the decrypted tenantId
     */
    static async decryptTenantId(encryptedTenantId: string): Promise<{ tenantId: string }> {
        if (!this.initialized) {
            await this.initialize();
        }

        const [encrypted, iv] = encryptedTenantId.split(':');

        if (!encrypted || !iv) {
            throw new Error('Invalid encrypted tenantId format');
        }

        const tenantId = this.decrypt(encrypted, iv);

        return { tenantId };
    }

    // Cleanup method to disconnect Prisma when needed
    static async disconnect(): Promise<void> {
        if (prisma) {
            await prisma.$disconnect();
        }
    }
}