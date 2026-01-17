import os from 'os';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import prisma from '../databases/prisma/client';
import { DatabaseInitializer } from '../databases/prisma/databaseInitializer';
import type { EncryptionResult, SetupParams } from 'security';
import type { Branch } from 'branch';

export class SecureSettingsService {
    private static initialized = false;
    private static readonly KEY_LENGTH = 32;
    private static readonly IV_LENGTH = 16;
    private static readonly AUTH_TAG_LENGTH = 16;
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static encryptionKey: Buffer | null = null;
    private static userDataPath: string;

    /**
     * Initialize the SecureSettingsService.
     * 
     * For Electron apps, pass `app.getPath('userData')` as storagePath.
     * 
     * @example
     * // Electron main process:
     * await SecureSettingsService.initialize(app.getPath('userData'));
     * 
     * @param storagePath - Custom path for data storage (required for Electron production)
     */
    static async initialize(storagePath = ''): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Resolve user data path
            this.userDataPath = storagePath || DatabaseInitializer.getUserDataPath();

            await fs.mkdir(this.userDataPath, { recursive: true });

            // Ensure database is ready (copy template if needed)
            await DatabaseInitializer.ensureReady(this.userDataPath);

            const keyPath = path.join(this.userDataPath, '.keystore');

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

            const isReady = await DatabaseInitializer.ensureReady(this.userDataPath);
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

    /**
     * Get the currently active branch for the Electron app
     * Returns the branch details from the stored setup along with the branch data
     * 
     * @example
     * // Electron main process (ipcMain handler):
     * ipcMain.handle('settings:get-active-branch', async () => {
     *     try {
     *         const activeBranch = await SecureSettingsService.getActiveBranch();
     *         return { success: true, data: activeBranch };
     *     } catch (error: any) {
     *         console.error('Failed to get active branch:', error);
     *         return { success: false, error: error.message };
     *     }
     * });
     * 
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
     * 
     * @example
     * // Electron main process (ipcMain handler):
     * ipcMain.handle('settings:set-active-branch', async (_event, branchId: string) => {
     *     try {
     *         await SecureSettingsService.setActiveBranch(branchId);
     *         return { success: true };
     *     } catch (error: any) {
     *         console.error('Failed to set active branch:', error);
     *         return { success: false, error: error.message };
     *     }
     * });
     * 
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
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const setup = await this.getAppSetup();

            if (!setup) {
                throw new Error('App setup not found. Please complete initial setup first.');
            }

            if (validateAccess) {
                // Validate the branch exists and belongs to the same tenant
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

            // Update the app setup with the new branch ID
            await this.updateAppSetup({
                branchId: branchId
            });

            // Return the updated active branch info
            return await this.getActiveBranch() as {
                branchId: string;
                tenantId: string;
                terminalId: string;
                branch: Branch | null;
            };
        } catch (error) {
            console.error('Error setting active branch:', error);
            throw error;
        }
    }

    /**
     * Get all available branches for the current tenant
     * Useful for populating branch switcher UI in Electron apps
     * 
     * @example
     * // Electron main process (ipcMain handler):
     * ipcMain.handle('settings:get-available-branches', async () => {
     *     try {
     *         const branches = await SecureSettingsService.getAvailableBranches();
     *         return { success: true, data: branches };
     *     } catch (error: any) {
     *         console.error('Failed to get available branches:', error);
     *         return { success: false, error: error.message };
     *     }
     * });
     * 
     * @param activeOnly - Whether to return only active branches (default: true)
     * @returns Array of branches for the current tenant
     */
    static async getAvailableBranches(activeOnly = true): Promise<Branch[]> {
        try {
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
        } catch (error) {
            console.error('Error getting available branches:', error);
            throw error;
        }
    }
}