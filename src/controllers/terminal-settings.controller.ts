import { Request, Response } from 'express';
import { TerminalSettingsService } from '../services/terminal-settings.service';
import { BaseController } from './base.controller';
import { SettingsGroupName } from '../types/terminal-settings';

export class TerminalSettingsController extends BaseController {
    /**
     * Get terminal settings by terminal ID
     */
    static async getSettings(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId } = req.params;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await TerminalSettingsService.getSettings(terminalId);

            if (!result) {
                BaseController.sendResponse(res, 404, false, 'Terminal settings not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Terminal settings retrieved successfully', result);
        } catch (error) {
            console.error('Error in terminal settings controller - getSettings:', error);
            BaseController.sendResponse(
                res,
                500,
                false,
                'Internal server error',
                null,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    /**
     * Get all terminal settings
     */
    static async getAllSettings(req: Request, res: Response): Promise<void> {
        try {
            const result = await TerminalSettingsService.getAllSettings();

            BaseController.sendResponse(res, 200, true, 'All terminal settings retrieved successfully', result);
        } catch (error) {
            console.error('Error in terminal settings controller - getAllSettings:', error);
            BaseController.sendResponse(
                res,
                500,
                false,
                'Internal server error',
                null,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    /**
     * Create terminal settings
     */
    static async createSettings(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId, ...settingsData } = req.body;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await TerminalSettingsService.createSettings({
                terminalId,
                ...settingsData,
            });

            BaseController.sendResponse(res, 201, true, 'Terminal settings created successfully', result);
        } catch (error) {
            console.error('Error in terminal settings controller - createSettings:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('already exist') ? 409 : 500;

            BaseController.sendResponse(
                res,
                statusCode,
                false,
                statusCode === 409 ? 'Terminal settings already exist' : 'Internal server error',
                null,
                errorMessage
            );
        }
    }

    /**
     * Update terminal settings
     */
    static async updateSettings(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId } = req.params;
            const updateData = req.body;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await TerminalSettingsService.updateSettings(terminalId, updateData);

            if (!result) {
                BaseController.sendResponse(res, 404, false, 'Terminal settings not found or update failed');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Terminal settings updated successfully', result);
        } catch (error) {
            console.error('Error in terminal settings controller - updateSettings:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('not found') ? 404 : 500;

            BaseController.sendResponse(
                res,
                statusCode,
                false,
                statusCode === 404 ? 'Terminal settings not found' : 'Internal server error',
                null,
                errorMessage
            );
        }
    }

    /**
     * Update a specific settings group
     */
    static async updateSettingsGroup(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId, groupName } = req.params;
            const groupData = req.body;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            if (!groupName) {
                BaseController.sendResponse(res, 400, false, 'Settings group name is required');
                return;
            }

            // Validate group name
            const validGroupNames: SettingsGroupName[] = [
                'localizationSettings',
                'transactionSettings',
                'customerSettings',
                'receiptSettings',
                'paymentSettings',
                'mraComplianceSettings',
                'inventorySettings',
                'syncSettings',
                'securitySettings',
                'performanceSettings',
                'hardwareSettings',
                'integrationSettings',
                'workflowSettings',
                'backupSettings',
                'displaySettings',
                'taxFeeSettings',
                'customerManagementSettings',
                'reportingSettings',
            ];

            if (!validGroupNames.includes(groupName as SettingsGroupName)) {
                BaseController.sendResponse(res, 400, false, `Invalid settings group name: ${groupName}`);
                return;
            }

            const result = await TerminalSettingsService.updateSettingsGroup(
                terminalId,
                groupName as SettingsGroupName,
                groupData
            );

            if (!result) {
                BaseController.sendResponse(res, 404, false, 'Terminal settings not found or update failed');
                return;
            }

            BaseController.sendResponse(
                res,
                200,
                true,
                `${groupName} updated successfully`,
                result
            );
        } catch (error) {
            console.error('Error in terminal settings controller - updateSettingsGroup:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = errorMessage.includes('not found') ? 404 : 500;

            BaseController.sendResponse(
                res,
                statusCode,
                false,
                statusCode === 404 ? 'Terminal settings not found' : 'Internal server error',
                null,
                errorMessage
            );
        }
    }

    /**
     * Delete terminal settings
     */
    static async deleteSettings(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId } = req.params;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await TerminalSettingsService.deleteSettings(terminalId);

            if (!result) {
                BaseController.sendResponse(res, 404, false, 'Terminal settings not found or deletion failed');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Terminal settings deleted successfully', { deleted: true });
        } catch (error) {
            console.error('Error in terminal settings controller - deleteSettings:', error);
            BaseController.sendResponse(
                res,
                500,
                false,
                'Internal server error',
                null,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    /**
     * Deactivate terminal settings (soft delete)
     */
    static async deactivateSettings(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId } = req.params;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await TerminalSettingsService.deactivateSettings(terminalId);

            if (!result) {
                BaseController.sendResponse(res, 404, false, 'Terminal settings not found or deactivation failed');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Terminal settings deactivated successfully', { deactivated: true });
        } catch (error) {
            console.error('Error in terminal settings controller - deactivateSettings:', error);
            BaseController.sendResponse(
                res,
                500,
                false,
                'Internal server error',
                null,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    /**
     * Get or create terminal settings
     */
    static async getOrCreateSettings(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId, ...settingsData } = req.body;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await TerminalSettingsService.getOrCreateSettings({
                terminalId,
                ...settingsData,
            });

            BaseController.sendResponse(res, 200, true, 'Terminal settings retrieved/created successfully', result);
        } catch (error) {
            console.error('Error in terminal settings controller - getOrCreateSettings:', error);
            BaseController.sendResponse(
                res,
                500,
                false,
                'Internal server error',
                null,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    /**
     * Check if terminal is configured
     */
    static async isConfigured(req: Request, res: Response): Promise<void> {
        try {
            const isConfigured = await TerminalSettingsService.isConfigured();

            BaseController.sendResponse(res, 200, true, 'Configuration status retrieved', { isConfigured });
        } catch (error) {
            console.error('Error in terminal settings controller - isConfigured:', error);
            BaseController.sendResponse(
                res,
                500,
                false,
                'Internal server error',
                null,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}
