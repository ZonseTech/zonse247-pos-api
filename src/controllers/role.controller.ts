import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { RoleService } from "../services/role.service";

export class RoleController extends BaseController {

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const query = req.query;
            const roles = await RoleService.getAllRoles(query);
            BaseController.sendResponse(res, 200, true, 'Roles retrieved successfully', roles);
        } catch (error: any) {
            console.error('Error fetching roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async create(req: Request<{}, ApiResponse<Role>, CreateRoleRequest>, res: Response): Promise<void> {
        try {
            const newRole = await RoleService.createRole(req.body);
            BaseController.sendResponse(res, 201, true, 'Role created successfully', newRole);
        } catch (error: any) {
            console.error('Error creating role:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
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

    static async update(req: Request<{ id: string }, ApiResponse<Role>, Partial<Role>>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedRole = await RoleService.updateRole(id, req.body);
            BaseController.sendResponse(res, 200, true, 'Role updated successfully', updatedRole);
        } catch (error: any) {
            console.error('Error updating role:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            } else if (error.message.includes('system role')) {
                statusCode = 403;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async show(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const role = await RoleService.getRoleById(id);
            BaseController.sendResponse(res, 200, true, 'Role retrieved successfully', role);
        } catch (error: any) {
            console.error('Error fetching role:', error);

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
            const result = await RoleService.deleteRole(id);
            BaseController.sendResponse(res, 200, true, 'Role deleted successfully', result);
        } catch (error: any) {
            console.error('Error deleting role:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('cannot be deleted') || error.message.includes('system role')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async getByClientUuid(req: Request<{ clientUuid: string }>, res: Response): Promise<void> {
        try {
            const { clientUuid } = req.params;
            const roles = await RoleService.getRolesByClientUuid(clientUuid);
            BaseController.sendResponse(res, 200, true, 'Client roles retrieved successfully', roles);
        } catch (error: any) {
            console.error('Error fetching client roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getByShopUuid(req: Request<{ shopUuid: string }>, res: Response): Promise<void> {
        try {
            const { shopUuid } = req.params;
            const roles = await RoleService.getRolesByShopUuid(shopUuid);
            BaseController.sendResponse(res, 200, true, 'Shop roles retrieved successfully', roles);
        } catch (error: any) {
            console.error('Error fetching shop roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getSystemRoles(req: Request, res: Response): Promise<void> {
        try {
            const roles = await RoleService.getSystemRoles();
            BaseController.sendResponse(res, 200, true, 'System roles retrieved successfully', roles);
        } catch (error: any) {
            console.error('Error fetching system roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getActiveRoles(req: Request, res: Response): Promise<void> {
        try {
            const roles = await RoleService.getActiveRoles();
            BaseController.sendResponse(res, 200, true, 'Active roles retrieved successfully', roles);
        } catch (error: any) {
            console.error('Error fetching active roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async activate(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const role = await RoleService.updateRoleStatus(id, true);
            BaseController.sendResponse(res, 200, true, 'Role activated successfully', role);
        } catch (error: any) {
            console.error('Error activating role:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async deactivate(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const role = await RoleService.updateRoleStatus(id, false);
            BaseController.sendResponse(res, 200, true, 'Role deactivated successfully', role);
        } catch (error: any) {
            console.error('Error deactivating role:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('system role')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async getRolePermissions(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const permissions = await RoleService.getRolePermissions(id);
            BaseController.sendResponse(res, 200, true, 'Role permissions retrieved successfully', permissions);
        } catch (error: any) {
            console.error('Error fetching role permissions:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async assignPermissions(req: Request<{ id: string }, ApiResponse<any>, { permissionUuids: string[] }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { permissionUuids } = req.body;
            const result = await RoleService.assignPermissionsToRole(id, permissionUuids);
            BaseController.sendResponse(res, 200, true, 'Permissions assigned successfully', result);
        } catch (error: any) {
            console.error('Error assigning permissions:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Invalid') || error.message.includes('required')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async removePermission(req: Request<{ id: string, permissionId: string }>, res: Response): Promise<void> {
        try {
            const { id, permissionId } = req.params;
            const result = await RoleService.removePermissionFromRole(id, permissionId);
            BaseController.sendResponse(res, 200, true, 'Permission removed successfully', result);
        } catch (error: any) {
            console.error('Error removing permission:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}