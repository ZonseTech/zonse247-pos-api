import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { BaseController } from './base.controller';

export class UserController extends BaseController {
	constructor() {
		super();
	}

	static async healthCheck(req: Request, res: Response): Promise<void> {
		BaseController.sendResponse(res, 200, true, 'Users API is running');
	}

	static async list(req: Request, res: Response): Promise<void> {
		try {
			const query = req.query;
			const users = await UserService.getAllUsers(query);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error: any) {
			console.error('Error retrieving users:', error);
			BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
		}
	}

	static async show(req: Request<{ id: string }, ApiResponse<PublicUser>>, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			if (!id) {
				BaseController.sendResponse(res, 400, false, 'User ID is required');
				return;
			}

			const user = await UserService.getUserById(id);
			BaseController.sendResponse(res, 200, true, 'User retrieved successfully', user);
		} catch (error: any) {
			console.error('Error retrieving user:', error);

			const statusCode = error.message.includes('not found') ? 404 : 500;
			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async store(req: Request<{}, ApiResponse<PublicUser>, CreateUserRequest>, res: Response): Promise<void> {
		try {
			const newUser = await UserService.createUser(req.body);
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

	static async update(req: Request<{ id: string; }, ApiResponse<PublicUser>, Partial<CreateUserRequest>>, res: Response): Promise<void> {
		try {
			const userId = req.params.id;
			const updateData = req.body;

			if (!userId) {
				BaseController.sendResponse(res, 400, false, 'User ID is required');
				return;
			}

			const updatedUser = await UserService.updateUser(userId, updateData);
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

	static async delete(req: Request<{ id: string }, ApiResponse<{ status: boolean }>>, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			if (!id) {
				BaseController.sendResponse(res, 400, false, 'User ID is required');
				return;
			}

			const result = await UserService.deleteUser(id);
			BaseController.sendResponse(res, 200, true, 'User deleted successfully', { status: true });
		} catch (error: any) {
			console.error('Error deleting user:', error);

			const statusCode = error.message.includes('not found') ? 404 : 500;
			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async login(req: Request<{}, ApiResponse<{ user: PublicUser; token: string }>, { username: string; password: string }>, res: Response): Promise<void> {
		try {
			const { username, password } = req.body;

			if (!username || !password) {
				BaseController.sendResponse(res, 400, false, 'Username and password are required');
				return;
			}

			const result = await UserService.loginUser(username, password);

			if (result.message) {
				BaseController.sendResponse(res, 401, false, result.message);
			} else {
				BaseController.sendResponse(res, 200, true, 'Login successful', {
					user: result.user!,
					token: result.token!
				});
			}
		} catch (error: any) {
			console.error('Error during login:', error);
			BaseController.sendResponse(res, 500, false, 'An unexpected error occurred during login', undefined, error.message);
		}
	}

	static async logout(req: Request<{ id: string }>, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			if (!id) {
				BaseController.sendResponse(res, 400, false, 'User ID is required');
				return;
			}

			await UserService.logoutUser(id);
			BaseController.sendResponse(res, 200, true, 'User logged out successfully');
		} catch (error: any) {
			console.error('Error during logout:', error);

			const statusCode = error.message.includes('not found') ? 404 : 500;
			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async refreshToken(req: Request<{}, ApiResponse<{ token: string }>, { token: string }>, res: Response): Promise<void> {
		try {
			const { token } = req.body;

			if (!token) {
				BaseController.sendResponse(res, 400, false, 'Token is required');
				return;
			}

			const newToken = await UserService.refreshToken(token);
			BaseController.sendResponse(res, 200, true, 'Token refreshed successfully', { token: newToken });
		} catch (error: any) {
			console.error('Error refreshing token:', error);

			let statusCode = 401;
			if (error.message.includes('not found') || error.message.includes('inactive')) {
				statusCode = 404;
			}

			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async verifyToken(req: Request<{}, ApiResponse<{ user: any }>, {}, {}, { authorization?: string; 'x-access-token'?: string }>, res: Response): Promise<void> {
		try {
			const token = req.headers.authorization?.replace('Bearer ', '') ||
				req.headers['x-access-token'];

			if (!token) {
				BaseController.sendResponse(res, 400, false, 'Token is required');
				return;
			}

			const decoded = UserService.verifyJWTToken(token as string);
			BaseController.sendResponse(res, 200, true, 'Token is valid', { user: decoded });
		} catch (error: any) {
			console.error('Error verifying token:', error);

			let statusCode = 401;
			if (error.message.includes('expired')) {
				statusCode = 401;
			} else if (error.message.includes('Invalid')) {
				statusCode = 401;
			}

			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async changePassword(req: Request<{ id: string }, ApiResponse<{ status: boolean }>, { currentPassword: string; newPassword: string }>, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const { currentPassword, newPassword } = req.body;

			if (!id) {
				BaseController.sendResponse(res, 400, false, 'User ID is required');
				return;
			}

			if (!currentPassword || !newPassword) {
				BaseController.sendResponse(res, 400, false, 'Current password and new password are required');
				return;
			}

			const result = await UserService.changePassword(id, currentPassword, newPassword);
			BaseController.sendResponse(res, 200, true, 'Password changed successfully', { status: true });
		} catch (error: any) {
			console.error('Error changing password:', error);

			let statusCode = 500;
			if (error.message.includes('not found')) {
				statusCode = 404;
			} else if (error.message.includes('incorrect') ||
				error.message.includes('invalid')) {
				statusCode = 400;
			}

			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async resetPassword(req: Request<{ id: string }>, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			if (!id) {
				BaseController.sendResponse(res, 400, false, 'User ID is required');
				return;
			}

			const result = await UserService.resetPassword(id);
			BaseController.sendResponse(res, 200, true, 'Password reset successfully', result);
		} catch (error: any) {
			console.error('Error resetting password:', error);

			const statusCode = error.message.includes('not found') ? 404 : 500;
			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}

	static async getUsersByRole(req: Request<{ roleId: string }>, res: Response): Promise<void> {
		try {
			const { roleId } = req.params;

			if (!roleId) {
				BaseController.sendResponse(res, 400, false, 'Role ID is required');
				return;
			}

			const users = await UserService.getUsersByRole(roleId);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error: any) {
			console.error('Error retrieving users by role:', error);
			BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
		}
	}

	static async getUsersByShop(req: Request<{ shopUuid: string }>, res: Response): Promise<void> {
		try {
			const { shopUuid } = req.params;

			if (!shopUuid) {
				BaseController.sendResponse(res, 400, false, 'Shop ID is required');
				return;
			}

			const users = await UserService.getUsersByShop(shopUuid);
			BaseController.sendResponse(res, 200, true, 'Users retrieved successfully', users);
		} catch (error: any) {
			console.error('Error retrieving users by shop:', error);
			BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
		}
	}

	static async updateUserStatus(req: Request<{ id: string }, ApiResponse<PublicUser>, { status: 'active' | 'inactive' | 'suspended' }>, res: Response): Promise<void> {
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

			const updatedUser = await UserService.updateUserStatus(id, status);
			BaseController.sendResponse(res, 200, true, 'User status updated successfully', updatedUser);
		} catch (error: any) {
			console.error('Error updating user status:', error);

			const statusCode = error.message.includes('not found') ? 404 : 500;
			BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
		}
	}
}