import { ApiResponse } from "network";
import { Request, Response } from "express";
import { AuthRequest } from "../lib/express.type";
import { BaseController } from "./base.controller";
import { CreateTerminalRequest, Terminal } from "terminal";
import { TerminalService } from "../services/terminal.service";
import { getScopeFromRequest } from "../utils/scope.utils";

/**
 * @class   TerminalController
 * @desc    Handles all terminal-related HTTP requests
 * @extends BaseController
 */
export class TerminalController {
    /**
     * @method  getAllTerminals
     * @desc    Retrieve all terminals for the authenticated tenant/branch
     * @param   req - Express request object with auth context and query parameters
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with terminals array
     * @throws  500 - Internal server error
     */
    static async getAllTerminals(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const scope = getScopeFromRequest(req);
            const isAdminMode = req.query.isAdminMode === 'true';
            const branchIdOverride = req.query.branchId as string | undefined;

            const terminals = await TerminalService.getAllTerminals(
                scope.build({
                    isAdminMode,
                    branchIdOverride
                })
            );
            BaseController.sendResponse(res, 200, true, 'Terminals retrieved successfully', terminals);
        } catch (error: any) {
            console.error('Error retrieving terminals:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * @method  createTerminal
     * @desc    Create a new terminal with auto-generated activation code
     * @param   req - Express request with CreateTerminalRequest body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with created terminal
     * @throws  400 - Missing required field (terminalLabel, terminalCode)
     * @throws  403 - Tenant does not own the branch
     * @throws  404 - Tenant or Branch not found
     * @throws  409 - Terminal already exists
     * @throws  500 - Internal server error
     */
    static async createTerminal(req: Request<ApiResponse<Terminal>, CreateTerminalRequest> & AuthRequest, res: Response): Promise<void> {
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

    /**
     * @method  getTerminal
     * @desc    Retrieve a single terminal by ID
     * @param   req - Express request with terminalId param
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with terminal data
     * @throws  404 - Terminal not found
     * @throws  500 - Internal server error
     */
    static async getTerminal(req: Request<{ terminalId: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const terminal = await TerminalService.getTerminalById(req.params.terminalId);
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

    /**
     * @method  updateTerminal
     * @desc    Update an existing terminal by ID
     * @param   req - Express request with terminalId param and partial Terminal body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with updated terminal data
     * @throws  403 - Tenant does not own the terminal
     * @throws  404 - Terminal not found
     * @throws  409 - Terminal code already exists
     * @throws  500 - Internal server error
     */
    static async updateTerminal(req: Request<{ terminalId: string }, ApiResponse<Terminal>, Partial<Terminal>> & AuthRequest, res: Response): Promise<void> {
        try {
            const updatedTerminal = await TerminalService.updateTerminal(req.params.terminalId, req.body);
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

    /**
     * @method  deleteTerminal
     * @desc    Delete a terminal by ID
     * @param   req - Express request with terminalId param and auth context
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with deletion status
     * @throws  404 - Terminal not found
     * @throws  500 - Internal server error
     */
    static async deleteTerminal(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const scope = getScopeFromRequest(req);
            const deleted = await TerminalService.deleteTerminal(
                req.params.id,
                scope.getTenantId(),
                scope.getBranchId()
            );
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
}