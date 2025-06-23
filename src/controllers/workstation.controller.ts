import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { WorkstationService } from "../services/workstation.service";

export class WorkStationController extends BaseController {

    static async createWorkstation(req: Request<{}, ApiResponse<Workstation>, CreateWorkstationRequest>, res: Response): Promise<void> {
        try {
            const newWorkstation = await WorkstationService.createWorkstation(req.body);
            BaseController.sendResponse(res, 201, true, 'Workstation created successfully', newWorkstation);
        } catch (error: any) {
            console.error('Error creating workstation:', error);
            let statusCode = 500;
            if (error.message.includes('Missing required field')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            } else if (error.message.includes('does not own')) {
                statusCode = 403;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async getAllWorkstations(req: Request, res: Response): Promise<void> {
        try {
            const workstations = await WorkstationService.getAllWorkstations(req.query);
            BaseController.sendResponse(res, 200, true, 'Workstations retrieved successfully', workstations);
        } catch (error: any) {
            console.error('Error retrieving workstations:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getWorkstation(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const workstation = await WorkstationService.getWorkstationById(req.params.id);
            if (!workstation) {
                BaseController.sendResponse(res, 404, false, 'Workstation not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Workstation retrieved successfully', workstation);
        } catch (error: any) {
            console.error('Error retrieving workstation:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async updateWorkstation(req: Request<{ id: string }, ApiResponse<Workstation>, Partial<Workstation>>, res: Response): Promise<void> {
        try {
            const updatedWorkstation = await WorkstationService.updateWorkstation(req.params.id, req.body);
            if (!updatedWorkstation) {
                BaseController.sendResponse(res, 404, false, 'Workstation not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Workstation updated successfully', updatedWorkstation);
        } catch (error: any) {
            console.error('Error updating workstation:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            } else if (error.message.includes('does not own')) {
                statusCode = 403;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async deleteWorkstation(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const deleted = await WorkstationService.deleteWorkstation(req.params.id);
            if (!deleted) {
                BaseController.sendResponse(res, 404, false, 'Workstation not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Workstation deleted successfully', { status: true });
        } catch (error: any) {
            console.error('Error deleting workstation:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async updateWorkstationStatus(req: Request<{ id: string }, ApiResponse<Workstation>, { status: 'active' | 'inactive' | 'maintenance' }>, res: Response): Promise<void> {
        try {
            const updatedWorkstation = await WorkstationService.updateWorkstationStatus(req.params.id, req.body.status);
            if (!updatedWorkstation) {
                BaseController.sendResponse(res, 404, false, 'Workstation not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Workstation status updated successfully', updatedWorkstation);
        } catch (error: any) {
            console.error('Error updating workstation status:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async syncWorkstation(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const syncResult = await WorkstationService.syncWorkstation(req.params.id);
            BaseController.sendResponse(res, 200, true, 'Workstation synced successfully', syncResult);
        } catch (error: any) {
            console.error('Error syncing workstation:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}