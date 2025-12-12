import validator from 'validator';
import { UserModel } from '../models/user.model';
import { RoleModel } from '../models/role.model';
import { RolePermissionModel } from '../models/role-permission.model';
import { PermissionModel } from '../models/permission.model';
import type { PublicUser, User } from 'users';
import type { Permission } from 'role-permission';
import { UserUncheckedCreateInput } from 'src/databases/prisma/generated/prisma/models';

export class UserService {

	static async selectAll(params): Promise<Array<User>> {
		return await UserModel.findAll({
			tenantId: params.tenantId,
		});
	}

	static async getUserById(userId: string): Promise<any> {
		if (!userId) {
			throw new Error('ID field is required.');
		}
		return await UserModel.findById(userId);
	}

	static async getAllUsers(query?: any): Promise<any[]> {
		let users: Array<User>;

		if (query && Object.keys(query).length > 0) {
			const searchCriteria: any = {};

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
		} else users = await UserModel.findAll();

		const publicUsers = await Promise.all(
			users.map(async (user) => {
				const roleData = await this.getRoleWithPermissions(user.roleId);
				return this.getPublicUser(user, roleData || {});
			})
		);

		return publicUsers;
	}

	static async createUser(userData: Partial<User>): Promise<any> {
		const userExists = await UserModel.checkUserExists(
			userData.username,
			userData.email
		);
		if (userExists) {
			throw new Error('User with this username or email already exists');
		}

		const newUserData = await UserModel.buildUserData({
			...userData,
			status: userData.status || 'active'
		} as unknown as UserUncheckedCreateInput) as unknown as UserUncheckedCreateInput;

		const user = await UserModel.create(newUserData);
		return UserModel.getPublicUser(user);
	}

	static async updateUser(userId: string, userData: any): Promise<Omit<User, 'password'>> {
		if (!userId) {
			throw new Error('ID field is required.');
		}

		const existingUser = await UserModel.findById(userId);
		if (!existingUser) {
			throw new Error('User not found');
		}

		const updatedUserData = { ...userData };

		delete updatedUserData.repeatPassword;

		if (userData.password === '') {
			delete updatedUserData.password;
		}

		await UserModel.update(userId, updatedUserData);

		const updatedUser = await UserModel.findById(userId);
		return UserModel.getPublicUser(updatedUser);
	}

	static async deleteUser(userId: string): Promise<void> {
		if (!userId) {
			throw new Error('ID field is required.');
		}
		await UserModel.delete(userId);
	}

	static async getUsersByRole(roleId: string): Promise<any[]> {
		if (!roleId) {
			throw new Error('Role ID is required.');
		}

		const users = await UserModel.findByRoleId(roleId);

		const publicUsers = await Promise.all(
			users.map(async (user) => {
				const roleData = await this.getRoleWithPermissions(user.roleId);
				return this.getPublicUser(user, roleData || {});
			})
		);

		return publicUsers;
	}

	static async getUsersByShop(branchId: string): Promise<any[]> {
		if (!branchId) {
			throw new Error('Shop ID is required.');
		}

		const users = await UserModel.findByBranchId(branchId);

		const publicUsers = await Promise.all(
			users.map(async (user) => {
				const roleData = await this.getRoleWithPermissions(user.roleId);
				return this.getPublicUser(user, roleData || {});
			})
		);

		return publicUsers;
	}

	static async updateUserStatus(
		userId: string,
		status: 'active' | 'inactive' | 'suspended'
	): Promise<any> {
		if (!userId) {
			throw new Error('User ID is required.');
		}

		if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
			throw new Error('Valid status is required (active, inactive, suspended).');
		}

		const user = await UserModel.findById(userId);
		if (!user) {
			throw new Error('User not found');
		}

		await UserModel.update(userId, { status });

		const updatedUser = await UserModel.findById(userId);
		const roleData = await this.getRoleWithPermissions(updatedUser.roleId);

		return this.getPublicUser(updatedUser, roleData || {});
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