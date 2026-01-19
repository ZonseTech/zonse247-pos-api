import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { BaseController } from './base.controller';
import { ApiResponse } from 'network';
import { PublicUser, User } from 'users';
import { AuthRequest } from '../lib/express.type';
import {
	ValidationError,
	ConflictError,
	NotFoundError,
	BusinessLogicError,
	DatabaseError,
} from '../utils/db-error-handler.util';

export class UserController extends BaseController {
	constructor() {
		super();
	}

	/**
	 * Centralized error handling for UserController
	 */
	private static handleError(res: Response, error: unknown): void {
		if (error instanceof ValidationError) {
			// Convert errors object to string for the error parameter
			const errorDetails = JSON.stringify(error.errors);
			BaseController.sendResponse(res, 400, false, error.message, undefined, errorDetails);
			return;
		}

		if (error instanceof ConflictError) {
			BaseController.sendResponse(res, 409, false, error.message, undefined, error.field);
			return;
		}

		if (error instanceof NotFoundError) {
			BaseController.sendResponse(res, 404, false, error.message);
			return;
		}

		if (error instanceof BusinessLogicError) {
			BaseController.sendResponse(res, 400, false, error.message);
			return;
		}

		if (error instanceof DatabaseError) {
			console.error('Database error:', error);
			BaseController.sendResponse(res, 500, false, error.message);
			return;
		}

		// Handle unknown errors
		const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
		console.error('Unexpected error in UserController:', error);
		BaseController.sendResponse(res, 500, false, errorMessage);
	}

	static async selectAll(req: Request & AuthRequest, res: Response): Promise<void> {
		try {
			const users = await UserService.selectAll(req.auth.tenantId, req.auth.activeBranchId || req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error) {
			UserController.handleError(res, error);
		}
	}

	static async healthCheck(req: Request, res: Response): Promise<void> {
		BaseController.sendResponse(res, 200, true, 'Users API is running');
	}

	static async list(req: Request & AuthRequest, res: Response): Promise<void> {
		try {
			const query = req.query;
			const users = await UserService.getAllUsers(query, req.auth.tenantId, req.auth.activeBranchId || req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error) {
			UserController.handleError(res, error);
		}
	}

	static async show(req: Request<{ id: string }, ApiResponse<PublicUser>> & AuthRequest, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			if (!id) {
				throw new ValidationError('User ID is required', { id: 'User ID is required' });
			}

			const user = await UserService.getUserById(id, req.auth.tenantId, req.auth.activeBranchId || req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'User retrieved successfully', user);
		} catch (error) {
			UserController.handleError(res, error);
		}
	}

	static async store(req: Request<ApiResponse<PublicUser>, Partial<User>> & AuthRequest, res: Response): Promise<void> {
		try {
			const newUser = await UserService.createUser(req.body, {
				tenantId: req.auth.tenantId,
				branchId: req.auth.activeBranchId || req.auth.branchId,
				userId: req.auth.userId,
			});
			BaseController.sendResponse(res, 201, true, 'User created successfully', newUser);
		} catch (error) {
			UserController.handleError(res, error);
		}
	}

	static async update(req: Request<{ id: string; }, ApiResponse<PublicUser>, Partial<User>> & AuthRequest, res: Response): Promise<void> {
		try {
			const userId = req.params.id;
			const updateData = req.body;

			if (!userId) {
				throw new ValidationError('User ID is required', { id: 'User ID is required' });
			}

			const updatedUser = await UserService.updateUser(userId, updateData, req.auth.tenantId, req.auth.activeBranchId || req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'User updated successfully', updatedUser);
		} catch (error) {
			UserController.handleError(res, error);
		}
	}

	static async delete(req: Request<{ id: string }, ApiResponse<{ status: boolean }>> & AuthRequest, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			if (!id) {
				throw new ValidationError('User ID is required', { id: 'User ID is required' });
			}

			await UserService.deleteUser(id, req.auth.tenantId, req.auth.activeBranchId || req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'User deleted successfully', { status: true });
		} catch (error) {
			UserController.handleError(res, error);
		}
	}

	static async getUsersByRole(req: Request<{ roleId: string }> & AuthRequest, res: Response): Promise<void> {
		try {
			const { roleId } = req.params;

			if (!roleId) {
				throw new ValidationError('Role ID is required', { roleId: 'Role ID is required' });
			}

			const users = await UserService.getUsersByRole(roleId, req.auth.tenantId, req.auth.activeBranchId || req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error) {
			UserController.handleError(res, error);
		}
	}

	static async getUsersByBranch(req: Request<{ branchUuid: string }> & AuthRequest, res: Response): Promise<void> {
		try {
			const { branchUuid } = req.params;

			if (!branchUuid) {
				throw new ValidationError('Branch ID is required', { branchUuid: 'Branch ID is required' });
			}

			const users = await UserService.getUsersByBranch(branchUuid, req.auth.tenantId);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error) {
			UserController.handleError(res, error);
		}
	}

	static async updateUserStatus(req: Request<{ id: string }, ApiResponse<PublicUser>, { status: 'active' | 'inactive' | 'suspended' }> & AuthRequest, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const { status } = req.body;

			if (!id) {
				throw new ValidationError('User ID is required', { id: 'User ID is required' });
			}

			// Status validation is now handled in UserService.updateUserStatus
			const updatedUser = await UserService.updateUserStatus(id, status, req.auth.tenantId, req.auth.activeBranchId || req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'User status updated successfully', updatedUser);
		} catch (error) {
			UserController.handleError(res, error);
		}
	}
}