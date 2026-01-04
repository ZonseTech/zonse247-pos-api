import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { BaseController } from './base.controller';
import { ApiResponse } from 'network';
import { PublicUser, User } from 'users';
import { AuthRequest } from '../lib/express.type';

export class UserController extends BaseController {
	constructor() {
		super();
	}

	static async selectAll(req: Request & AuthRequest, res: Response): Promise<void> {
		try {
			const users = await UserService.selectAll(req.auth.tenantId, req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error: any) {
			console.error('Error fetching users:', error);
			BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
		}
	}

	static async healthCheck(req: Request, res: Response): Promise<void> {
		BaseController.sendResponse(res, 200, true, 'Users API is running');
	}

	static async list(req: Request & AuthRequest, res: Response): Promise<void> {
		try {
			const query = req.query;
			const users = await UserService.getAllUsers(query, req.auth.tenantId, req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error: any) {
			console.error('Error retrieving users:', error);
			BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
		}
	}

	static async show(req: Request<{ id: string }, ApiResponse<PublicUser>> & AuthRequest, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			if (!id) {
				BaseController.sendResponse(res, 400, false, 'User ID is required');
				return;
			}

			const user = await UserService.getUserById(id, req.auth.tenantId, req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'User retrieved successfully', user);
		} catch (error: any) {
			console.error('Error retrieving user:', error);

			const statusCode = error.message.includes('not found') ? 404 : 500;
			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async store(req: Request<ApiResponse<PublicUser>, Partial<User>> & AuthRequest, res: Response): Promise<void> {
		try {
			const newUser = await UserService.createUser(req.body, {
				tenantId: req.auth.tenantId,
				branchId: req.auth.branchId,
				userId: req.auth.userId,
			});
			BaseController.sendResponse(res, 201, true, 'User created successfully', newUser);
		} catch (error: any) {
			console.error('Error creating user:', error);

			let statusCode = 500;
			if (error.message.includes('Missing required field') ||
				error.message.includes('Invalid email format') ||
				error.message.includes('Password must be')) {
				statusCode = 400;
			} else if (error.message.includes('already exists')) {
				statusCode = 409;
			}

			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async update(req: Request<{ id: string; }, ApiResponse<PublicUser>, Partial<User>> & AuthRequest, res: Response): Promise<void> {
		try {
			const userId = req.params.id;
			const updateData = req.body;

			if (!userId) {
				BaseController.sendResponse(res, 400, false, 'User ID is required');
				return;
			}

			await UserService.updateUser(userId, updateData, req.auth.tenantId, req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'User updated successfully', updateData);
		} catch (error: any) {
			console.error('Error updating user:', error);

			let statusCode = 500;
			if (error.message.includes('not found')) {
				statusCode = 404;
			} else if (error.message.includes('already exists') ||
				error.message.includes('Failed to update')) {
				statusCode = 409;
			} else if (error.message.includes('Invalid') ||
				error.message.includes('required')) {
				statusCode = 400;
			}

			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async delete(req: Request<{ id: string }, ApiResponse<{ status: boolean }>> & AuthRequest, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			if (!id) {
				BaseController.sendResponse(res, 400, false, 'User ID is required');
				return;
			}

			await UserService.deleteUser(id, req.auth.tenantId, req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'User deleted successfully', { status: true });
		} catch (error: any) {
			console.error('Error deleting user:', error);

			const statusCode = error.message.includes('not found') ? 404 : 500;
			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async getUsersByRole(req: Request<{ roleId: string }> & AuthRequest, res: Response): Promise<void> {
		try {
			const { roleId } = req.params;

			if (!roleId) {
				BaseController.sendResponse(res, 400, false, 'Role ID is required');
				return;
			}

			const users = await UserService.getUsersByRole(roleId, req.auth.tenantId, req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error: any) {
			console.error('Error retrieving users by role:', error);
			BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
		}
	}

	static async getUsersByBranch(req: Request<{ branchUuid: string }> & AuthRequest, res: Response): Promise<void> {
		try {
			const { branchUuid } = req.params;

			if (!branchUuid) {
				BaseController.sendResponse(res, 400, false, 'Branch ID is required');
				return;
			}

			const users = await UserService.getUsersByBranch(branchUuid, req.auth.tenantId);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error: any) {
			console.error('Error retrieving users by branch:', error);
			BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
		}
	}

	static async updateUserStatus(req: Request<{ id: string }, ApiResponse<PublicUser>, { status: 'active' | 'inactive' | 'suspended' }> & AuthRequest, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const { status } = req.body;

			if (!id) {
				BaseController.sendResponse(res, 400, false, 'User ID is required');
				return;
			}

			if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
				BaseController.sendResponse(res, 400, false, 'Valid status is required (active, inactive, suspended)');
				return;
			}

			const updatedUser = await UserService.updateUserStatus(id, status, req.auth.tenantId, req.auth.branchId);
			BaseController.sendResponse(res, 200, true, 'User status updated successfully', updatedUser);
		} catch (error: any) {
			console.error('Error updating user status:', error);

			const statusCode = error.message.includes('not found') ? 404 : 500;
			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}
}