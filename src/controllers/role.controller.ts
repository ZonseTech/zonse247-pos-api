import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { RoleService, RoleAuthContext } from "../services/auth/role.service";
import { ApiResponse } from "network";
import { CreateRoleRequest, Role } from "role-permission";
import { AuthRequest } from "../lib/express.type";
import { parsePaginationParams } from "../utils/pagination.utils"; import { AuditService, getAuditContext } from '../services/audit.service';

const getRoleAuthContext = (req: any): RoleAuthContext => ({
    tenantId: req.auth.tenantId,
    branchId: req.auth.currentBranchId || req.auth.branchId,
});

export class RoleController extends BaseController {

    static async selectAll(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const roles = await RoleService.getAllRoles({}, getRoleAuthContext(req));
            BaseController.sendResponse(res, 200, true, 'Roles retrieved successfully', roles);
        } catch (error: any) {
            console.error('Error fetching roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async list(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const query = req.query;
            const pagination = parsePaginationParams(req.query);
            const result = await RoleService.listRoles(query, pagination, getRoleAuthContext(req));
            BaseController.sendPaginated(res, 'Roles retrieved successfully', result.data, result.pagination, 'roles');
        } catch (error: any) {
            console.error('Error fetching roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async create(req: Request<ApiResponse<Role>, CreateRoleRequest> & AuthRequest, res: Response): Promise<void> {
        try {
            const newRole = await RoleService.createRole(req.body, getRoleAuthContext(req));

            AuditService.logCreate(getAuditContext(req), 'Role', (newRole as any).roleId || '', (newRole as any).name || (req.body as any).name || '', req.body as any);

            BaseController.sendResponse(res, 201, true, 'Role created successfully', newRole);
        } catch (error: any) {
            console.error('Error creating role:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid') || error.message.includes('must contain only')) {
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

    static async update(req: Request<{ id: string }, ApiResponse<Role>, Partial<Role>> & AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedRole = await RoleService.updateRole(id, req.body, getRoleAuthContext(req));

            AuditService.logUpdate(getAuditContext(req), 'Role', id, (updatedRole as any).name || id, undefined, req.body as any);

            BaseController.sendResponse(res, 200, true, 'Role updated successfully', updatedRole);
        } catch (error: any) {
            console.error('Error updating role:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid') || error.message.includes('must contain only')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            } else if (error.message.includes('does not own')) {
                statusCode = 403;
            } else if (error.message.includes('system role')) {
                statusCode = 403;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async show(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const role = await RoleService.getRoleById(id, getRoleAuthContext(req));
            BaseController.sendResponse(res, 200, true, 'Role retrieved successfully', role);
        } catch (error: any) {
            console.error('Error fetching role:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('does not own')) {
                statusCode = 403;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async delete(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await RoleService.deleteRole(id, getRoleAuthContext(req));

            AuditService.logDelete(getAuditContext(req), 'Role', id, id);

            BaseController.sendResponse(res, 200, true, 'Role deleted successfully', result);
        } catch (error: any) {
            console.error('Error deleting role:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('does not own')) {
                statusCode = 403;
            } else if (error.message.includes('cannot be deleted') || error.message.includes('system role')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
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

    static async getActiveRoles(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const roles = await RoleService.getActiveRoles(getRoleAuthContext(req));
            BaseController.sendResponse(res, 200, true, 'Active roles retrieved successfully', roles);
        } catch (error: any) {
            console.error('Error fetching active roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async activate(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const role = await RoleService.updateRoleStatus(id, true, getRoleAuthContext(req));

            AuditService.logStatusChange(getAuditContext(req), 'update', 'Role', id, (role as any).name || id, 'inactive', 'active');

            BaseController.sendResponse(res, 200, true, 'Role activated successfully', role);
        } catch (error: any) {
            console.error('Error activating role:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('does not own')) {
                statusCode = 403;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async deactivate(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const role = await RoleService.updateRoleStatus(id, false, getRoleAuthContext(req));

            AuditService.logStatusChange(getAuditContext(req), 'update', 'Role', id, (role as any).name || id, 'active', 'inactive');

            BaseController.sendResponse(res, 200, true, 'Role deactivated successfully', role);
        } catch (error: any) {
            console.error('Error deactivating role:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('does not own')) {
                statusCode = 403;
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
