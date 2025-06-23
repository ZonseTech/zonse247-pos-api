import { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service';
import { BaseController } from './base.controller';

export class SettingsController extends BaseController {

    static async setup(req: Request, res: Response): Promise<void> {
        try {
            const result = await SettingsService.checkAppSetup();
            BaseController.sendResponse(res, 200, true, 'Setup retrieved successfully', result);
        } catch (error) {
            console.error('', error)
            BaseController.sendResponse(res, 500, false, 'Internal server error', null, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    static async getSettings(req: Request, res: Response): Promise<void> {
        try {
            const result = await SettingsService.getSettings();

            BaseController.sendResponse(res, 200, true, 'Settings retrieved successfully', result);
        } catch (error) {
            console.error('Error in settings controller - getSettings:', error);
            BaseController.sendResponse(res, 500, false, 'Internal server error', null, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    static async createSettings(req: Request, res: Response): Promise<void> {
        try {
            const { clientUuid, shopUuid, workstationUuid } = req.body;

            if (!clientUuid || !shopUuid || !workstationUuid) {
                BaseController.sendResponse(res, 400, false, 'clientUuid, shopUuid, and workstationUuid are required');
                return;
            }

            const result = await SettingsService.store({ clientUuid, shopUuid, workstationUuid });

            if (result) await SettingsService.updateSetupConfigurations();

            BaseController.sendResponse(res, 201, true, 'Settings created successfully', result);
        } catch (error) {
            console.error('Error in settings controller - createSettings:', error);
            BaseController.sendResponse(res, 500, false, 'Internal server error', null, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    static async getSetting(req: Request, res: Response): Promise<void> {
        try {
            const { key } = req.params;
            const { clientUuid, shopUuid, workstationUuid } = req.query;

            if (!clientUuid || !shopUuid || !workstationUuid || !key) {
                BaseController.sendResponse(res, 400, false, 'clientUuid, shopUuid, workstationUuid, and key are required');
                return;
            }

            const result = await SettingsService.getSetting(
                clientUuid as string,
                shopUuid as string,
                workstationUuid as string,
                key
            );

            if (!result) {
                BaseController.sendResponse(res, 404, false, 'Setting not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Setting retrieved successfully', result);
        } catch (error) {
            console.error('Error in settings controller - getSetting:', error);
            BaseController.sendResponse(res, 500, false, 'Internal server error', null, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    static async updateSetting(req: Request, res: Response): Promise<void> {
        try {
            const { uuid } = req.params;
            const updateData = req.body;

            if (!uuid) {
                BaseController.sendResponse(res, 400, false, 'Setting UUID is required');
                return;
            }

            const result = await SettingsService.updateSetting(uuid, updateData);

            if (!result) {
                BaseController.sendResponse(res, 404, false, 'Setting not found or update failed');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Setting updated successfully', { updated: true });
        } catch (error) {
            console.error('Error in settings controller - updateSetting:', error);
            BaseController.sendResponse(res, 500, false, 'Internal server error', null, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    static async deleteSetting(req: Request, res: Response): Promise<void> {
        try {
            const { uuid } = req.params;

            if (!uuid) {
                BaseController.sendResponse(res, 400, false, 'Setting UUID is required');
                return;
            }

            const result = await SettingsService.deleteSetting(uuid);

            if (!result) {
                BaseController.sendResponse(res, 404, false, 'Setting not found or deletion failed');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Setting deleted successfully', { deleted: true });
        } catch (error) {
            console.error('Error in settings controller - deleteSetting:', error);
            BaseController.sendResponse(res, 500, false, 'Internal server error', null, error instanceof Error ? error.message : 'Unknown error');
        }
    }
}
