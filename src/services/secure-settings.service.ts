import os from 'os';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import type { Branch } from 'branch';
import prisma from '../databases/prisma/client';
import type { EncryptionResult, SetupParams } from 'security';
import { DatabaseInitializer } from '../databases/prisma/databaseInitializer';

export class SecureSettingsService {
    private static initialized = false;
    private static userDataPath: string;
    private static readonly IV_LENGTH = 16;
    private static readonly KEY_LENGTH = 32;
    private static readonly AUTH_TAG_LENGTH = 16;
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static encryptionKey: Buffer | null = null;
    private static readonly TERMINAL_META_FILENAME = '.terminal-meta';

    /**
     * Initialize the SecureSettingsService.
     * 
     * For Electron apps, pass `app.getPath('userData')` as storagePath.
     * @param storagePath - Custom path for data storage (required for Electron production)
     */
    static async initialize(storagePath = ''): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            this.userDataPath = storagePath || DatabaseInitializer.getUserDataPath();

            await fs.mkdir(this.userDataPath, { recursive: true });

            await DatabaseInitializer.ensureReady(this.userDataPath);

            const keyPath = path.join(this.userDataPath, '.keystore');

            try {
                const existingKey = await fs.readFile(keyPath);
                this.encryptionKey = existingKey;
            } catch (error) {
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
            }

            this.initialized = true;
        } catch (error) {
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

    /**
     * Store the terminal ID in a local metadata file.
     * This allows us to identify the app setup record on subsequent app launches.
     * @param terminalId - The terminal ID to store
     */
    private static async storeTerminalId(terminalId: string): Promise<void> {
        const metaPath = path.join(this.userDataPath, this.TERMINAL_META_FILENAME);
        await fs.writeFile(metaPath, terminalId, { mode: 0o600 });
    }

    /**
     * Retrieve the stored terminal ID from the local metadata file.
     * Used to look up the app setup record using terminalId as the setupId.
     * @returns The stored terminal ID or null if not found
     */
    private static async getStoredTerminalId(): Promise<string | null> {
        try {
            const metaPath = path.join(this.userDataPath, this.TERMINAL_META_FILENAME);
            const terminalId = await fs.readFile(metaPath, 'utf-8');
            return terminalId || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Clear the stored terminal ID metadata file.
     * Called when clearing the app setup.
     */
    private static async clearStoredTerminalId(): Promise<void> {
        try {
            const metaPath = path.join(this.userDataPath, this.TERMINAL_META_FILENAME);
            await fs.unlink(metaPath);
        } catch (error) {
            // File doesn't exist, nothing to clear
        }
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
        if (!this.initialized) {
            await this.initialize();
        }

        if (!params.terminalId) {
            throw new Error('terminalId is required for app setup');
        }

        const verificationToken = params.verificationToken || '';

        const { encrypted, iv } = this.encrypt(verificationToken);

        const signature = this.createDataSignature(
            verificationToken,
            params.tenantId || '',
            params.branchId || '',
            params.terminalId
        );
        const now = new Date();

        await this.storeTerminalId(params.terminalId);

        await prisma.appSetup.upsert({
            where: { setupId: params.terminalId },
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
                setupId: params.terminalId,
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
    }

    static async getAppSetup(): Promise<SetupParams | null> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const storedTerminalId = await this.getStoredTerminalId();
            if (!storedTerminalId) {
                return null;
            }

            const encryptedSetup = await prisma.appSetup.findUnique({
                where: { setupId: storedTerminalId }
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
            return null;
        }
    }

    static async hasAppSetup(): Promise<boolean> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const isReady = await DatabaseInitializer.ensureReady(this.userDataPath);
            if (!isReady) {
                return false;
            }

            const storedTerminalId = await this.getStoredTerminalId();
            if (!storedTerminalId) {
                return false;
            }

            const setup = await prisma.appSetup.findUnique({
                where: { setupId: storedTerminalId }
            });
            return setup !== null;
        } catch (error) {
            return false;
        }
    }

    static async clearAppSetup(): Promise<void> {
        const storedTerminalId = await this.getStoredTerminalId();
        if (!storedTerminalId) {
            return;
        }

        await prisma.appSetup.delete({
            where: { setupId: storedTerminalId }
        });

        await this.clearStoredTerminalId();
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

    static async createActivationCode(params: { tenantId: string; branchId: string; terminalId: string }): Promise<string> {
        const { terminalId } = params;

        if (!this.initialized) {
            await this.initialize();
        }

        const { encrypted, iv } = this.encrypt(terminalId);

        const encryptedString = `${encrypted}:${iv}`;

        return encryptedString;
    }

    /**
     * Decrypt an activation code to retrieve the terminal ID
     * @param activationCode - The encrypted activation code
     * @returns Object containing the decrypted terminalId
     * @throws Error - Invalid activation code format
     */
    static async decryptActivationCode(activationCode: string): Promise<{ terminalId: string }> {
        if (!this.initialized) {
            await this.initialize();
        }

        const [encrypted, iv] = activationCode.split(':');

        if (!encrypted || !iv) {
            throw new Error('Invalid activation code format');
        }

        const terminalId = this.decrypt(encrypted, iv);

        return { terminalId };
    }

    /**
     * Cleanup method to disconnect Prisma when needed
     * @returns Promise<void>
     */
    static async disconnect(): Promise<void> {
        if (prisma) {
            await prisma.$disconnect();
        }
    }

    /**
     * Get the currently active branch for the Electron app
     * Returns the branch details from the stored setup along with the branch data
     * @returns Active branch information or null if not set up
     */
    static async getActiveBranch(): Promise<{
        branchId: string;
        tenantId: string;
        terminalId: string;
        branch: Branch | null;
    } | null> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const setup = await this.getAppSetup();

            if (!setup || !setup.branchId) {
                return null;
            }

            // Get the full branch details from the database
            const branch = await prisma.branch.findFirst({
                where: {
                    branchId: setup.branchId,
                    tenantId: setup.tenantId
                }
            });

            return {
                branchId: setup.branchId,
                tenantId: setup.tenantId,
                terminalId: setup.terminalId,
                branch: branch as Branch | null
            };
        } catch (error) {
            console.error('Error getting active branch:', error);
            throw error;
        }
    }

    /**
     * Set/switch the active branch for the Electron app
     * Updates the stored branchId in the app setup
     * @param branchId - The branch ID to switch to
     * @param validateAccess - Whether to validate the branch exists and is active (default: true)
     * @returns The updated branch information
     */
    static async setActiveBranch(
        branchId: string,
        validateAccess = true
    ): Promise<{
        branchId: string;
        tenantId: string;
        terminalId: string;
        branch: Branch | null;
    }> {
        if (!this.initialized) {
            await this.initialize();
        }

        const setup = await this.getAppSetup();

        if (!setup) {
            throw new Error('App setup not found. Please complete initial setup first.');
        }

        if (validateAccess) {
            const branch = await prisma.branch.findFirst({
                where: {
                    branchId: branchId,
                    tenantId: setup.tenantId
                }
            });

            if (!branch) {
                throw new Error('Branch not found or does not belong to this tenant');
            }

            if (branch.status !== 'active') {
                throw new Error('Cannot switch to an inactive branch');
            }
        }

        await this.updateAppSetup({
            branchId: branchId
        });

        return await this.getActiveBranch() as {
            branchId: string;
            tenantId: string;
            terminalId: string;
            branch: Branch | null;
        };
    }

    /**
     * Get all available branches for the current tenant
     * Useful for populating branch switcher UI in Electron apps
     * @param activeOnly - Whether to return only active branches (default: true)
     * @returns Array of branches for the current tenant
     */
    static async getAvailableBranches(activeOnly = true): Promise<Branch[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        const setup = await this.getAppSetup();

        if (!setup || !setup.tenantId) {
            throw new Error('App setup not found. Please complete initial setup first.');
        }

        const whereClause: any = {
            tenantId: setup.tenantId
        };

        if (activeOnly) {
            whereClause.status = 'active';
        }

        const branches = await prisma.branch.findMany({
            where: whereClause,
            orderBy: {
                branchName: 'asc'
            }
        });

        return branches as Branch[];
    }
}