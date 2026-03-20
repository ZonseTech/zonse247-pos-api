import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { RolePermissionService } from "../services/auth/role-permission.service";
import { ApiResponse } from "network";
import { BulkRolePermissionRequest, CreateRolePermissionRequest, RolePermission } from "role-permission";
import { parsePaginationParams } from "../utils/pagination.utils"; import { AuditService, getAuditContext } from '../services/audit.service';
export class RolePermissionController extends BaseController {

    static async selectAll(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const roles = await RolePermissionService.selectAll(params);
            BaseController.sendResponse(res, 200, true, 'Role permissions retrieved successfully', roles);
        } catch (error: any) {
            console.error('Error fetching roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const query = req.query;
            const pagination = parsePaginationParams(req.query);
            const result = await RolePermissionService.listRolePermissions(query, pagination);
            BaseController.sendPaginated(res, 'Role permissions retrieved successfully', result.data, result.pagination, 'rolePermissions');
        } catch (error: any) {
            console.error('Error fetching role permissions:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async create(req: Request<ApiResponse<RolePermission>, CreateRolePermissionRequest>, res: Response): Promise<void> {
        try {
            const newRolePermission = await RolePermissionService.createRolePermission(req.body);

            AuditService.logCreate(getAuditContext(req), 'RolePermission', (newRolePermission as any).rolePermissionId || '', `${(req.body as any).roleId}:${(req.body as any).permissionId}`, req.body as any);

            BaseController.sendResponse(res, 201, true, 'Role permission created successfully', newRolePermission);
        } catch (error: any) {
            console.error('Error creating role permission:', error);

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

    static async delete(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await RolePermissionService.deleteRolePermission(id);

            AuditService.logDelete(getAuditContext(req), 'RolePermission', id, id);

            BaseController.sendResponse(res, 200, true, 'Role permission deleted successfully', result);
        } catch (error: any) {
            console.error('Error deleting role permission:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async bulkAssign(req: Request<ApiResponse<any>, BulkRolePermissionRequest>, res: Response): Promise<void> {
        try {
            const result = await RolePermissionService.bulkAssignPermissions(req.body);

            AuditService.logBulk(getAuditContext(req), 'create', 'RolePermission', (req.body as any).permissionUuids?.length || 0, `Bulk assigned permissions to role ${(req.body as any).roleUuid}`);

            BaseController.sendResponse(res, 201, true, 'Permissions assigned successfully', result);
        } catch (error: any) {
            console.error('Error bulk assigning permissions:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async bulkRemove(req: Request<ApiResponse<any>, BulkRolePermissionRequest>, res: Response): Promise<void> {
        try {
            const result = await RolePermissionService.bulkRemovePermissions(req.body);

            AuditService.logBulk(getAuditContext(req), 'delete', 'RolePermission', (req.body as any).permissionUuids?.length || 0, `Bulk removed permissions from role ${(req.body as any).roleUuid}`);

            BaseController.sendResponse(res, 200, true, 'Permissions removed successfully', result);
        } catch (error: any) {
            console.error('Error bulk removing permissions:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async getByRoleUuid(req: Request<{ roleUuid: string }>, res: Response): Promise<void> {
        try {
            const { roleUuid } = req.params;
            const pagination = parsePaginationParams(req.query as Record<string, any>);
            const result = await RolePermissionService.listRolePermissionsByRoleUuid(roleUuid, pagination);
            BaseController.sendPaginated(res, 'Role permissions retrieved successfully', result.data, result.pagination, 'rolePermissions');
        } catch (error: any) {
            console.error('Error fetching role permissions by role UUID:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getByPermissionUuid(req: Request<{ permissionUuid: string }>, res: Response): Promise<void> {
        try {
            const { permissionUuid } = req.params;
            const pagination = parsePaginationParams(req.query as Record<string, any>);
            const result = await RolePermissionService.listRolePermissionsByPermissionUuid(permissionUuid, pagination);
            BaseController.sendPaginated(res, 'Role permissions retrieved successfully', result.data, result.pagination, 'rolePermissions');
        } catch (error: any) {
            console.error('Error fetching role permissions by permission UUID:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async checkAssignment(req: Request<{ roleUuid: string, permissionUuid: string }>, res: Response): Promise<void> {
        try {
            const { roleUuid, permissionUuid } = req.params;
            const exists = await RolePermissionService.checkRolePermissionExists(roleUuid, permissionUuid);
            BaseController.sendResponse(res, 200, true, 'Assignment check completed', { exists });
        } catch (error: any) {
            console.error('Error checking role permission assignment:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }
}