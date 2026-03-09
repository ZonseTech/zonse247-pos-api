import { ApiResponse } from "network";
import { Request, Response } from "express";
import { AuthRequest } from "../lib/express.type";
import { BaseController } from "./base.controller";
import { Branch, CreateBranchRequest } from "branch";
import { BranchService } from "../services/branch.service";
import { TerminalModel } from "../models/terminal.model";

/**
 * @class   BranchController
 * @desc    Handles all branch-related HTTP requests
 * @extends BaseController
 */
export class BranchController {

    /**
     * @method  list
     * @desc    Retrieve all branches for the authenticated tenant
     * @param   req - Express request object with auth context and query parameters
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with branches array
     * @throws  500 - Internal server error
     */
    static async list(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const query = req.query;
            const branches = await BranchService.getAllBranches(query, req.auth.tenantId);
            BaseController.sendResponse(res, 200, true, 'Branches retrieved successfully', branches);
        } catch (error: any) {
            console.error('Error fetching branches:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * @method  create
     * @desc    Create a new branch with associated subscription
     * @param   req - Express request with CreateBranchRequest body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with created branch
     * @throws  400 - Missing required field, Tenant must be active, Maximum branches exceeded
     * @throws  403 - Tenant does not own the resource
     * @throws  404 - Tenant not found
     * @throws  409 - Branch already exists
     * @throws  500 - Internal server error
     */
    static async create(req: Request<ApiResponse<Branch>, CreateBranchRequest> & AuthRequest, res: Response): Promise<void> {
        try {
            const newBranch = await BranchService.createBranch(req.body, req.auth.userId);
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

    /**
     * @method  update
     * @desc    Update an existing branch by ID
     * @param   req - Express request with branchId param and partial Branch body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with updated branch data
     * @throws  400 - Missing required field or invalid data
     * @throws  404 - Branch not found
     * @throws  409 - Branch code already exists
     * @throws  500 - Internal server error
     */
    static async update(req: Request<{ branchId: string }, ApiResponse<Branch>, Partial<Branch>> & AuthRequest, res: Response): Promise<void> {
        try {
            const { branchId } = req.params;
            const updatedBranch = await BranchService.updateBranch(branchId, req.body);
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

    /**
     * @method  show
     * @desc    Retrieve a single branch by ID
     * @param   req - Express request with branchId param
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with branch data
     * @throws  404 - Branch not found
     * @throws  500 - Internal server error
     */
    static async show(req: Request<{ branchId: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const { branchId } = req.params;
            const branch = await BranchService.getBranchById(branchId);
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

    /**
     * @method  delete
     * @desc    Delete a branch by ID
     * @param   req - Express request with branchId param
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with deletion status
     * @throws  400 - Branch cannot be deleted
     * @throws  404 - Branch not found
     * @throws  500 - Internal server error
     */
    static async delete(req: Request<{ branchId: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const { branchId } = req.params;
            const result = await BranchService.deleteBranch(branchId);
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

    /**
     * @method  getPrimaryTerminalId
     * @desc    Get the primary terminal ID for a branch (used by web clients)
     * @param   req - Express request with tenantId and branchId query params
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with primary terminal ID
     * @throws  400 - Missing required parameters
     * @throws  404 - Primary terminal not found
     * @throws  500 - Internal server error
     */
    static async getPrimaryTerminalId(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.query.tenantId as string || req.auth?.tenantId;
            const branchId = req.query.branchId as string || req.auth?.branchId;

            if (!branchId) {
                BaseController.sendResponse(res, 400, false, 'Branch ID is required');
                return;
            }

            const primaryTerminal = await TerminalModel.findPrimaryByBranchId(branchId, tenantId);

            if (!primaryTerminal) {
                BaseController.sendResponse(res, 404, false, 'No primary terminal found for this branch. Please set a terminal as primary.');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Primary terminal retrieved successfully', {
                terminalId: primaryTerminal.terminalId,
                terminalCode: primaryTerminal.terminalCode,
                terminalLabel: primaryTerminal.terminalLabel
            });
        } catch (error: any) {
            console.error('Error fetching primary terminal:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }
}