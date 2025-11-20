import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { TerminalService } from "../services/terminal.service";
import { ApiResponse } from "network";
import { CreateTerminalRequest, Terminal } from "terminal";

export class TerminalController extends BaseController {

    static async createTerminal(req: Request<ApiResponse<Terminal>, CreateTerminalRequest>, res: Response): Promise<void> {
        try {
            const newTerminal = await TerminalService.createTerminal(req.body);
            BaseController.sendResponse(res, 201, true, 'Terminal created successfully', newTerminal);
        } catch (error: any) {
            console.error('Error creating terminal:', error);
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

    static async getAllTerminals(req: Request, res: Response): Promise<void> {
        try {
            const terminals = await TerminalService.getAllTerminals(req.query);
            BaseController.sendResponse(res, 200, true, 'Terminals retrieved successfully', terminals);
        } catch (error: any) {
            console.error('Error retrieving terminals:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getTerminal(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const terminal = await TerminalService.getTerminalById(req.params.id);
            if (!terminal) {
                BaseController.sendResponse(res, 404, false, 'Terminal not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Terminal retrieved successfully', terminal);
        } catch (error: any) {
            console.error('Error retrieving terminal:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async updateTerminal(req: Request<{ id: string }, ApiResponse<Terminal>, Partial<Terminal>>, res: Response): Promise<void> {
        try {
            const updatedTerminal = await TerminalService.updateTerminal(req.params.id, req.body);
            if (!updatedTerminal) {
                BaseController.sendResponse(res, 404, false, 'Terminal not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Terminal updated successfully', updatedTerminal);
        } catch (error: any) {
            console.error('Error updating terminal:', error);
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

    static async deleteTerminal(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const deleted = await TerminalService.deleteTerminal(req.params.id);
            if (!deleted) {
                BaseController.sendResponse(res, 404, false, 'Terminal not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Terminal deleted successfully', { status: true });
        } catch (error: any) {
            console.error('Error deleting terminal:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async updateTerminalStatus(req: Request<{ id: string }, ApiResponse<Terminal>, { status: 'PENDING' | 'ACTIVATED' | 'DEACTIVATED' | 'SUSPENDED' | 'BLOCKED' }>, res: Response): Promise<void> {
        try {
            const updatedTerminal = await TerminalService.updateTerminalStatus(req.params.id, req.body.status);
            if (!updatedTerminal) {
                BaseController.sendResponse(res, 404, false, 'Terminal not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Terminal status updated successfully', updatedTerminal);
        } catch (error: any) {
            console.error('Error updating terminal status:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async syncTerminal(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const syncResult = await TerminalService.syncTerminal(req.params.id);
            BaseController.sendResponse(res, 200, true, 'Terminal synced successfully', syncResult);
        } catch (error: any) {
            console.error('Error syncing terminal:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async getTerminalsByBranch(req: Request<{ branchId: string }>, res: Response): Promise<void> {
        try {
            const terminals = await TerminalService.getTerminalsByBranchId(req.params.branchId);
            BaseController.sendResponse(res, 200, true, 'Terminals retrieved successfully', terminals);
        } catch (error: any) {
            console.error('Error retrieving terminals:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }
}