import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { sealDBModel } from '../databases/local';
import { APP_SETUP_DB } from '../databases/local/tables';
import { SyncService } from './sync.service';
import { ElectronStorageAdapter, NodeStorageAdapter } from '../lib/security-adapter.lib';
import { isElectron } from '../utils';

export class SecureSettingsService {
    private static initialized = false;
    private static readonly KEY_LENGTH = 32;
    private static readonly IV_LENGTH = 16;
    private static readonly AUTH_TAG_LENGTH = 16;
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static encryptionKey: Buffer | null = null;
    private static storageAdapter: StorageAdapter;

    static async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {

            if (isElectron()) {
                this.storageAdapter = new ElectronStorageAdapter();
            } else {
                this.storageAdapter = new NodeStorageAdapter(path.join(__dirname, '../.secure-data'));
            }

            const dataPath = this.storageAdapter.getUserDataPath();
            await fs.mkdir(dataPath, { recursive: true });

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
        const os = require('os');

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
            const encryptedSetup: SetupData = {
                setupId: '-1',
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                encryptedVerificationToken: encrypted,
                iv: iv,
                dataSignature: signature,
                createdAt: now,
                updatedAt: now,
            };

            try {
                await sealDBModel.delete(APP_SETUP_DB, '-1');
            } catch (error) {
                // Ignore if doesn't exist
            }

            await sealDBModel.insert(APP_SETUP_DB, encryptedSetup);

            const syncService = new SyncService();
            await syncService.syncTable('users', 'pull');

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

            const encryptedSetup = await sealDBModel.findById<any>(
                APP_SETUP_DB,
                { setupId: '-1' }
            );

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
            const setup = await sealDBModel.findById(APP_SETUP_DB, { setupId: '-1' });
            // return setup !== null;
            return false
        } catch (error) {
            return false;
        }
    }

    static async clearAppSetup(): Promise<void> {
        try {
            await sealDBModel.delete(APP_SETUP_DB, '-1');
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
            console.error('Error getting tenantSignature:', error);
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
            console.error('Error verifying tenant signature:', error);
            return { isValid: false };
        }
    }

    /**
     * Encrypt a tenantId and return the encrypted string
     * @param tenantId - The plain tenant ID to encrypt (e.g., 'tenant-456')
     * @returns The encrypted tenant ID string (e.g., '70610b28-c886-4647-acb5-d7565883545f')
     */
    static async encryptTenantId(tenantId: string): Promise<string> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const { encrypted, iv } = this.encrypt(tenantId);

            const encryptedString = `${encrypted}:${iv}`;

            console.log('TenantId encrypted successfully');
            return encryptedString;
        } catch (error) {
            console.error('Error encrypting tenantId:', error);
            throw error;
        }
    }

    /**
     * Decrypt an encrypted tenantId string
     * @param encryptedTenantId - The encrypted tenant ID (e.g., '70610b28-c886-4647-acb5-d7565883545f')
     * @returns Object containing the decrypted tenantId
     */
    static async decryptTenantId(encryptedTenantId: string): Promise<{ tenantId: string }> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const [encrypted, iv] = encryptedTenantId.split(':');

            if (!encrypted || !iv) {
                throw new Error('Invalid encrypted tenantId format');
            }

            const tenantId = this.decrypt(encrypted, iv);

            return { tenantId };
        } catch (error) {
            throw error;
        }
    }
}