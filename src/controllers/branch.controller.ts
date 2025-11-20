import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { BranchService } from "../services/branch.service";
import { TerminalService } from "../services/terminal.service";
import { ApiResponse } from "network";
import { Terminal } from "terminal";
import { Branch, CreateBranchRequest } from "branch";

export class BranchController extends BaseController {

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const query = req.query;
            const branches = await BranchService.getAllBranches(query);
            BaseController.sendResponse(res, 200, true, 'Branches retrieved successfully', branches);
        } catch (error: any) {
            console.error('Error fetching branches:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getBranchTerminals(req: Request<{ branchId: string }, ApiResponse<Array<Terminal>>>, res: Response): Promise<void> {

        try {
            const { branchId } = req.params;

            const terminal = await TerminalService.getTerminalsByBranchId(branchId);

            BaseController.sendResponse(
                res, 200, true,
                'Terminal retrieved successfully',
                terminal
            );
        } catch (error: any) {
            console.error('Error fetching branch Terminal:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async create(req: Request<ApiResponse<Branch>, CreateBranchRequest>, res: Response): Promise<void> {
        try {
            const newBranch = await BranchService.createBranch(req.body);
            BaseController.sendResponse(res, 201, true, 'Branch created successfully', newBranch);
        } catch (error: any) {
            console.error('Error creating branch:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Tenant must be active') || error.message.includes('Maximum number of branches')) {
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

    static async update(req: Request<{ id: string }, ApiResponse<Branch>, Partial<Branch>>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedBranch = await BranchService.updateBranch(id, req.body);
            BaseController.sendResponse(res, 200, true, 'Branch updated successfully', updatedBranch);
        } catch (error: any) {
            console.error('Error updating branch:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async show(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const branch = await BranchService.getBranchById(id);
            BaseController.sendResponse(res, 200, true, 'Branch retrieved successfully', branch);
        } catch (error: any) {
            console.error('Error fetching branch:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async delete(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await BranchService.deleteBranch(id);
            BaseController.sendResponse(res, 200, true, 'Branch deleted successfully', result);
        } catch (error: any) {
            console.error('Error deleting branch:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('cannot be deleted')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}