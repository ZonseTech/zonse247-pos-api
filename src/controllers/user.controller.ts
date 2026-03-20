import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { BaseController } from './base.controller';
import { ApiResponse } from 'network';
import { PublicUser, User } from 'users';
import { AuthRequest } from '../lib/express.type';
import {
	ValidationError,
} from '../utils/db-error-handler.util';
import { getScopeFromRequest } from '../utils/scope.utils';
import { parsePaginationParams } from '../utils/pagination.utils';
import { AuditService, getAuditContext } from '../services/audit.service';

export class UserController {

	static async list(req: Request & AuthRequest, res: Response): Promise<void> {
		try {
			const query = req.query;
			const scope = getScopeFromRequest(req);
			const isAdminMode = req.query.isAdminMode === 'true';
			const branchIdOverride = req.query.branchId as string | undefined;
			const tenantIdOverride = req.query.tenantId as string | undefined;
			const pagination = parsePaginationParams(req.query);

			const result = await UserService.listUsers(query, scope.build({
				isAdminMode,
				branchIdOverride,
				tenantIdOverride,
			}), pagination);
			BaseController.sendPaginated(res, 'Users retrieved successfully', result.data, result.pagination, 'users');
		} catch (error) {
			ValidationError.handleError(res, error);
		}
	}

	static async store(req: Request<ApiResponse<PublicUser>, Partial<User>> & AuthRequest, res: Response): Promise<void> {
		try {
			const userData = {
				...req.body,
				tenantId: req.body.tenantId || req.auth.tenantId,
				branchId: req.body.branchId || req.auth.activeBranchId || req.auth.branchId,
			};
			const newUser = await UserService.createUser(userData);

			AuditService.logCreate(getAuditContext(req), 'User', (newUser as any).userId || '', (newUser as any).username || userData.username || '', { tenantId: userData.tenantId, branchId: userData.branchId });

			BaseController.sendResponse(res, 201, true, 'User created successfully', newUser);
		} catch (error) {
			ValidationError.handleError(res, error);
		}
	}

	static async show(req: Request<{ userId: string }, ApiResponse<PublicUser>> & AuthRequest, res: Response): Promise<void> {
		try {
			const { userId } = req.params;

			if (!userId) {
				throw new ValidationError('User ID is required', { userId: 'User ID is required' });
			}

			const user = await UserService.getUserById(userId);
			BaseController.sendResponse(res, 200, true, 'User retrieved successfully', user);
		} catch (error) {
			ValidationError.handleError(res, error);
		}
	}

	static async update(req: Request<{ userId: string; }, ApiResponse<PublicUser>, Partial<User>> & AuthRequest, res: Response): Promise<void> {
		try {
			const { userId } = req.params;
			const updateData = req.body;

			if (!userId) {
				throw new ValidationError('User ID is required', { userId: 'User ID is required' });
			}

			const updatedUser = await UserService.updateUser(userId, updateData);

			AuditService.logUpdate(getAuditContext(req), 'User', userId, (updatedUser as any).username || userId, undefined, updateData as any);

			BaseController.sendResponse(res, 200, true, 'User updated successfully', updatedUser);
		} catch (error) {
			ValidationError.handleError(res, error);
		}
	}

	static async delete(req: Request<{ userId: string }, ApiResponse<{ status: boolean }>> & AuthRequest, res: Response): Promise<void> {
		try {
			const { userId } = req.params;

			if (!userId) {
				throw new ValidationError('User ID is required', { userId: 'User ID is required' });
			}

			await UserService.deleteUser(userId);

			AuditService.logDelete(getAuditContext(req), 'User', userId, userId);

			BaseController.sendResponse(res, 200, true, 'User deleted successfully', { status: true });
		} catch (error) {
			ValidationError.handleError(res, error);
		}
	}
}