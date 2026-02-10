/* eslint-disable @typescript-eslint/no-non-null-assertion */
import validator from 'validator';
import { UserModel } from '../models/user.model';
import { RoleModel } from '../models/role.model';
import { RolePermissionModel } from '../models/role-permission.model';
import { PermissionModel } from '../models/permission.model';
import type { PublicUser, User } from 'users';
import type { Permission } from 'role-permission';
import { UserUncheckedCreateInput } from 'src/databases/prisma/generated/prisma/models';
import {
	DbErrorHandler,
	ValidationError,
	ConflictError,
	NotFoundError,
} from '../utils/db-error-handler.util';

/**
 * User-specific error messages
 */
export const UserErrors = {
	USER_NOT_FOUND: (id: string) => `User with ID "${id}" was not found.`,
	USER_EXISTS: 'A user with this username or email already exists.',
	USERNAME_EXISTS: (username: string) => `Username "${username}" is already taken.`,
	EMAIL_EXISTS: (email: string) => `Email "${email}" is already in use.`,
	ROLE_NOT_FOUND: (id: string) => `Role with ID "${id}" does not exist.`,
	BRANCH_NOT_FOUND: (id: string) => `Branch with ID "${id}" does not exist.`,
	INVALID_EMAIL: 'Please provide a valid email address.',
	INVALID_STATUS: 'Status must be one of: active, inactive, suspended.',
	PASSWORD_REQUIRED: 'Password is required.',
	PASSWORD_TOO_SHORT: (minLength: number) => `Password must be at least ${minLength} characters long.`,
	USERNAME_REQUIRED: 'Username is required.',
	FULLNAME_REQUIRED: 'Full name is required.',
	ROLE_REQUIRED: 'Role is required.',
	CANNOT_DELETE_SELF: 'You cannot delete your own account.',
	CANNOT_DEACTIVATE_SELF: 'You cannot deactivate your own account.',
};

export class UserService {

	/**
	 * Validate user input data
	 */
	static validateUserInput(userData: Partial<User>, isCreate = true): void {
		const errors: Record<string, string> = {};

		if (isCreate) {
			if (!userData.username || userData.username.trim().length === 0) {
				errors.username = UserErrors.USERNAME_REQUIRED;
			}

			if (!userData.fullname || userData.fullname.trim().length === 0) {
				errors.fullname = UserErrors.FULLNAME_REQUIRED;
			}

			if (!userData.roleId) {
				errors.roleId = UserErrors.ROLE_REQUIRED;
			}

			if (!userData.password || userData.password.length === 0) {
				errors.password = UserErrors.PASSWORD_REQUIRED;
			} else if (userData.password.length < 6) {
				errors.password = UserErrors.PASSWORD_TOO_SHORT(6);
			}
		}

		// Validate email format if provided
		if (userData.email && !validator.isEmail(userData.email)) {
			errors.email = UserErrors.INVALID_EMAIL;
		}

		// Validate status if provided
		if (userData.status && !['active', 'inactive', 'suspended'].includes(userData.status)) {
			errors.status = UserErrors.INVALID_STATUS;
		}

		if (Object.keys(errors).length > 0) {
			throw new ValidationError('User validation failed', errors);
		}
	}

	static async selectAll(tenantId: string, branchId: string): Promise<Array<User>> {
		try {
			return await UserModel.findAll({
				tenantId,
				branchId,
			});
		} catch (error) {
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async getUserById(userId: string, tenantId: string, branchId: string): Promise<any> {
		if (!userId) {
			throw new ValidationError('User ID is required', { userId: 'User ID field is required.' });
		}

		try {
			const user = await UserModel.findById(userId, tenantId, branchId);
			if (!user) {
				throw new NotFoundError('User', userId);
			}
			return user;
		} catch (error) {
			if (error instanceof NotFoundError || error instanceof ValidationError) {
				throw error;
			}
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async getAllUsers(query?: any, tenantId?: string, branchId?: string): Promise<any[]> {
		try {
			let users: Array<User>;

			if (query && Object.keys(query).length > 0) {
				const searchCriteria: any = {};

				// Add tenant/branch filtering
				if (tenantId) searchCriteria.tenantId = tenantId;
				if (branchId) searchCriteria.branchId = branchId;

				if (query.status) {
					searchCriteria.status = query.status;
				}
				if (query.roleId) {
					searchCriteria.roleId = query.roleId;
				}
				if (query.branchId) {
					searchCriteria.branchId = query.branchId;
				}
				if (query.search) {
					const searchTerm = validator.escape(query.search);
					searchCriteria.$or = [
						{ username: { $regex: searchTerm, $options: 'i' } },
						{ email: { $regex: searchTerm, $options: 'i' } },
						{ fullname: { $regex: searchTerm, $options: 'i' } }
					];
				}

				users = await UserModel.findAll(searchCriteria);
			} else {
				const searchCriteria: any = {};
				if (tenantId) searchCriteria.tenantId = tenantId;
				if (branchId) searchCriteria.branchId = branchId;
				users = await UserModel.findAll(searchCriteria);
			}

			const publicUsers = await Promise.all(
				users.map(async (user) => {
					const roleData = await this.getRoleWithPermissions(user.roleId);
					return this.getPublicUser(user, roleData || {});
				})
			);

			return publicUsers;
		} catch (error) {
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async createUser(userData: Partial<User>, auth: { tenantId: string; branchId: string; userId: string }): Promise<any> {
		try {
			this.validateUserInput(userData, true);

			const userExists = await UserModel.checkUserExists(
				userData.username!,
				userData.email || ''
			);
			if (userExists) {
				throw new ConflictError(UserErrors.USER_EXISTS, 'username');
			}

			const user = await UserModel.create({
				...userData,
				tenantId: auth.tenantId,
				branchId: userData.branchId || auth.branchId,
				status: userData.status || 'active'
			} as unknown as UserUncheckedCreateInput);

			return UserModel.getPublicUser(user);
		} catch (error) {
			if (error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError) {
				throw error;
			}
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async updateUser(userId: string, userData: any, tenantId: string, branchId: string): Promise<Omit<User, 'password'>> {
		if (!userId) {
			throw new ValidationError('User ID is required', { userId: 'User ID field is required.' });
		}

		try {
			// Validate input (not a create operation)
			this.validateUserInput(userData, false);

			const existingUser = await UserModel.findById(userId, tenantId, branchId);
			if (!existingUser) {
				throw new NotFoundError('User', userId);
			}

			const updatedUserData = { ...userData };

			delete updatedUserData.repeatPassword;

			if (userData.password === '') {
				delete updatedUserData.password;
			}

			await UserModel.update(userId, updatedUserData);

			const updatedUser = await UserModel.findById(userId, tenantId, branchId);
			return UserModel.getPublicUser(updatedUser!);
		} catch (error) {
			if (error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError) {
				throw error;
			}
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async deleteUser(userId: string, tenantId: string, branchId: string): Promise<void> {
		if (!userId) {
			throw new ValidationError('User ID is required', { userId: 'User ID field is required.' });
		}

		try {
			// Verify user belongs to tenant/branch before deletion
			const user = await UserModel.findById(userId, tenantId, branchId);
			if (!user) {
				throw new NotFoundError('User', userId);
			}

			await UserModel.delete(userId);
		} catch (error) {
			if (error instanceof ValidationError || error instanceof NotFoundError) {
				throw error;
			}
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async getUsersByRole(roleId: string, tenantId: string, branchId: string): Promise<any[]> {
		if (!roleId) {
			throw new ValidationError('Role ID is required', { roleId: 'Role ID field is required.' });
		}

		try {
			const users = await UserModel.findByRoleId(roleId, tenantId, branchId);

			const publicUsers = await Promise.all(
				users.map(async (user) => {
					const roleData = await this.getRoleWithPermissions(user.roleId);
					return this.getPublicUser(user, roleData || {});
				})
			);

			return publicUsers;
		} catch (error) {
			if (error instanceof ValidationError) {
				throw error;
			}
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async getUsersByBranch(branchId: string, tenantId: string): Promise<any[]> {
		if (!branchId) {
			throw new ValidationError('Branch ID is required', { branchId: 'Branch ID field is required.' });
		}

		try {
			const users = await UserModel.findByBranchId(branchId, tenantId);

			const publicUsers = await Promise.all(
				users.map(async (user) => {
					const roleData = await this.getRoleWithPermissions(user.roleId);
					return this.getPublicUser(user, roleData || {});
				})
			);

			return publicUsers;
		} catch (error) {
			if (error instanceof ValidationError) {
				throw error;
			}
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async updateUserStatus(
		userId: string,
		status: 'active' | 'inactive' | 'suspended',
		tenantId: string,
		branchId: string
	): Promise<any> {
		if (!userId) {
			throw new ValidationError('User ID is required', { userId: 'User ID field is required.' });
		}

		if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
			throw new ValidationError('Invalid status', { status: UserErrors.INVALID_STATUS });
		}

		try {
			const user = await UserModel.findById(userId, tenantId, branchId);
			if (!user) {
				throw new NotFoundError('User', userId);
			}

			await UserModel.update(userId, { status });

			const updatedUser = await UserModel.findById(userId, tenantId, branchId);
			const roleData = await this.getRoleWithPermissions(updatedUser!.roleId);

			return this.getPublicUser(updatedUser!, roleData || {});
		} catch (error) {
			if (error instanceof ValidationError || error instanceof NotFoundError) {
				throw error;
			}
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async checkUserExists(username: string, email: string): Promise<boolean> {
		return await UserModel.checkUserExists(
			validator.escape(username),
			validator.escape(email)
		);
	}

	static getPublicUser(user: User, privileges: any): PublicUser {
		const { password: _, ...publicUser } = user;
		return {
			...publicUser,
			roleName: privileges.roleName || null,
			permissions: privileges.permissions || null,
		};
	}

	static async getRoleWithPermissions(
		roleId: string
	): Promise<{ roleName: string; permissions: string[] } | null> {
		try {
			const role = await RoleModel.findById(roleId);
			if (!role) return null;

			const rolePermissions = await RolePermissionModel.findByRoleId(
				roleId
			);

			const permissionDetails = await Promise.all(
				rolePermissions.map((rp) =>
					PermissionModel.findById(rp.permissionId)
				)
			);

			const permissions = permissionDetails
				.filter((p): p is Permission => !!p)
				.map(p => p.name);

			return {
				roleName: role.name,
				permissions,
			};
		} catch (error) {
			console.error('Error fetching role data:', error);
			return null;
		}
	}
}