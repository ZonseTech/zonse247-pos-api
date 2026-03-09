import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { BaseController } from './base.controller';
import { ApiResponse } from 'network';
import { PublicUser, User } from 'users';
import { AuthRequest } from '../lib/express.type';
import {
	ValidationError,
} from '../utils/db-error-handler.util';

export class UserController {

	static async list(req: Request & AuthRequest, res: Response): Promise<void> {
		try {
			const query = req.query;
			const users = await UserService.getAllUsers(query, {
				tenantId: req.auth.tenantId,
				branchId: req.auth.activeBranchId || req.auth.branchId,
			});
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error) {
			ValidationError.handleError(res, error);
		}
	}

	static async store(req: Request<ApiResponse<PublicUser>, Partial<User>> & AuthRequest, res: Response): Promise<void> {
		try {
			const newUser = await UserService.createUser(req.body);
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
			BaseController.sendResponse(res, 200, true, 'User deleted successfully', { status: true });
		} catch (error) {
			ValidationError.handleError(res, error);
		}
	}
}