import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { PermissionService } from "../services/permission.service";
import { PermissionScope } from "../models/permission.model";

export class PermissionController extends BaseController {

    static async selectAll(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const permissions = await PermissionService.selectAll(params);
            BaseController.sendResponse(res, 200, true, 'Permissions retrieved successfully', permissions);
        } catch (error: any) {
            console.error('Error fetching permissions:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const query = req.query;
            const permissions = await PermissionService.getAllPermissions(query);
            BaseController.sendResponse(res, 200, true, 'Permissions retrieved successfully', permissions);
        } catch (error: any) {
            console.error('Error fetching permissions:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async create(req: Request<{}, ApiResponse<Permission>, CreatePermissionRequest>, res: Response): Promise<void> {
        try {
            const newPermission = await PermissionService.createPermission(req.body);
            BaseController.sendResponse(res, 201, true, 'Permission created successfully', newPermission);
        } catch (error: any) {
            console.error('Error creating permission:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
                statusCode = 400;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async update(req: Request<{ id: string }, ApiResponse<Permission>, Partial<Permission>>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedPermission = await PermissionService.updatePermission(id, req.body);
            BaseController.sendResponse(res, 200, true, 'Permission updated successfully', updatedPermission);
        } catch (error: any) {
            console.error('Error updating permission:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            } else if (error.message.includes('system permission')) {
                statusCode = 403;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async show(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const permission = await PermissionService.getPermissionById(id);
            BaseController.sendResponse(res, 200, true, 'Permission retrieved successfully', permission);
        } catch (error: any) {
            console.error('Error fetching permission:', error);

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
            const result = await PermissionService.deletePermission(id);
            BaseController.sendResponse(res, 200, true, 'Permission deleted successfully', result);
        } catch (error: any) {
            console.error('Error deleting permission:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('cannot be deleted') || error.message.includes('system permission')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async getByCategory(req: Request<{ category: string }>, res: Response): Promise<void> {
        try {
            const { category } = req.params;
            const permissions = await PermissionService.getPermissionsByCategory(category);
            BaseController.sendResponse(res, 200, true, 'Category permissions retrieved successfully', permissions);
        } catch (error: any) {
            console.error('Error fetching category permissions:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getByScope(req: Request<{ scope: string }>, res: Response): Promise<void> {
        try {
            const { scope } = req.params;
            const permissions = await PermissionService.getPermissionsByScope(scope as PermissionScope);
            BaseController.sendResponse(res, 200, true, 'Scope permissions retrieved successfully', permissions);
        } catch (error: any) {
            console.error('Error fetching scope permissions:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getSystemPermissions(req: Request, res: Response): Promise<void> {
        try {
            const permissions = await PermissionService.getSystemPermissions();
            BaseController.sendResponse(res, 200, true, 'System permissions retrieved successfully', permissions);
        } catch (error: any) {
            console.error('Error fetching system permissions:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getCategories(req: Request, res: Response): Promise<void> {
        try {
            const categories = await PermissionService.getPermissionCategories();
            BaseController.sendResponse(res, 200, true, 'Permission categories retrieved successfully', categories);
        } catch (error: any) {
            console.error('Error fetching permission categories:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getScopes(req: Request, res: Response): Promise<void> {
        try {
            const scopes = await PermissionService.getPermissionScopes();
            BaseController.sendResponse(res, 200, true, 'Permission scopes retrieved successfully', scopes);
        } catch (error: any) {
            console.error('Error fetching permission scopes:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }
}