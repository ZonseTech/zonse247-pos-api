import { TerminalSettingsModel } from '../models/terminal-settings.model';
import {
    TerminalSettings,
    CreateTerminalSettingsRequest,
    UpdateTerminalSettingsRequest,
    SettingsGroupName,
} from '../types/terminal-settings';

export class TerminalSettingsService {
    /**
     * Get terminal settings by terminal ID
     * If settings don't exist for the terminal, creates and saves default settings
     */
    static async getSettings(terminalId: string): Promise<TerminalSettings | null> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            const existing = await TerminalSettingsModel.findByTerminalId(terminalId);
            if (existing) {
                return existing;
            }

            return await TerminalSettingsModel.create({ terminalId });
        } catch (error) {
            console.error('Error in terminal settings service - getSettings:', error);
            throw error;
        }
    }

    /**
     * Get all terminal settings
     */
    static async getAllSettings(): Promise<TerminalSettings[]> {
        try {
            return await TerminalSettingsModel.findAll();
        } catch (error) {
            console.error('Error in terminal settings service - getAllSettings:', error);
            throw error;
        }
    }

    /**
     * Create terminal settings
     */
    static async createSettings(data: CreateTerminalSettingsRequest): Promise<TerminalSettings> {
        try {
            if (!data.terminalId) {
                throw new Error('Terminal ID is required');
            }

            // Check if settings already exist for this terminal
            const existing = await TerminalSettingsModel.findByTerminalId(data.terminalId);
            if (existing) {
                throw new Error('Terminal settings already exist for this terminal');
            }

            return await TerminalSettingsModel.create(data);
        } catch (error) {
            console.error('Error in terminal settings service - createSettings:', error);
            throw error;
        }
    }

    /**
     * Update terminal settings
     */
    static async updateSettings(
        terminalId: string,
        updateData: UpdateTerminalSettingsRequest
    ): Promise<TerminalSettings | null> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            // Check if settings exist
            const existing = await TerminalSettingsModel.findByTerminalId(terminalId);
            if (!existing) {
                throw new Error('Terminal settings not found');
            }

            return await TerminalSettingsModel.update(terminalId, updateData);
        } catch (error) {
            console.error('Error in terminal settings service - updateSettings:', error);
            throw error;
        }
    }

    /**
     * Update a specific settings group
     */
    static async updateSettingsGroup<T extends object>(
        terminalId: string,
        groupName: SettingsGroupName,
        data: T
    ): Promise<TerminalSettings | null> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            if (!groupName) {
                throw new Error('Settings group name is required');
            }

            // Check if settings exist
            const existing = await TerminalSettingsModel.findByTerminalId(terminalId);
            if (!existing) {
                throw new Error('Terminal settings not found');
            }

            return await TerminalSettingsModel.updateSettingsGroup(terminalId, groupName, data);
        } catch (error) {
            console.error(`Error in terminal settings service - updateSettingsGroup (${groupName}):`, error);
            throw error;
        }
    }

    /**
     * Delete terminal settings
     */
    static async deleteSettings(terminalId: string): Promise<boolean> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            return await TerminalSettingsModel.delete(terminalId);
        } catch (error) {
            console.error('Error in terminal settings service - deleteSettings:', error);
            throw error;
        }
    }

    /**
     * Deactivate terminal settings (soft delete)
     */
    static async deactivateSettings(terminalId: string): Promise<boolean> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            return await TerminalSettingsModel.deactivate(terminalId);
        } catch (error) {
            console.error('Error in terminal settings service - deactivateSettings:', error);
            throw error;
        }
    }

    /**
     * Get or create terminal settings
     */
    static async getOrCreateSettings(data: CreateTerminalSettingsRequest): Promise<TerminalSettings> {
        try {
            if (!data.terminalId) {
                throw new Error('Terminal ID is required');
            }

            const existing = await TerminalSettingsModel.findByTerminalId(data.terminalId);
            if (existing) {
                return existing;
            }

            return await TerminalSettingsModel.create(data);
        } catch (error) {
            console.error('Error in terminal settings service - getOrCreateSettings:', error);
            throw error;
        }
    }

    /**
     * Check if terminal is configured
     */
    static async isConfigured(): Promise<boolean> {
        try {
            return await TerminalSettingsModel.isConfigured();
        } catch (error) {
            console.error('Error in terminal settings service - isConfigured:', error);
            return false;
        }
    }

    /**
     * Get verification token
     */
    static async getVerificationToken(): Promise<string | null> {
        try {
            return await TerminalSettingsModel.getVerificationToken();
        } catch (error) {
            console.error('Error in terminal settings service - getVerificationToken:', error);
            return null;
        }
    }
}
