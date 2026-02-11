/* eslint-disable @typescript-eslint/no-non-null-assertion */
import validator from 'validator';
import { UserModel } from '../models/user.model';
import { RoleModel } from '../models/role.model';
import { RolePermissionModel } from '../models/role-permission.model';
import { PermissionModel } from '../models/permission.model';
import { StaffModel } from '../models/staff.model';
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
			// Username can be generated from email, so only require one of them
			if ((!userData.username || userData.username.trim().length === 0) &&
				(!userData.email || userData.email.trim().length === 0)) {
				errors.username = 'Username or email is required';
			}

			if (!userData.fullname || userData.fullname.trim().length === 0) {
				errors.fullname = UserErrors.FULLNAME_REQUIRED;
			}

			if (!userData.roleId) {
				errors.roleId = UserErrors.ROLE_REQUIRED;
			}

			// Password is optional for staff creation (auto-generated)
			if (userData.password !== undefined && userData.password !== null && userData.password.length > 0 && userData.password.length < 6) {
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
			// Extract staff-related fields from userData
			const {
				trackAttendance,
				allowAppAccess,
				calculateAs,
				staffSalary,
				avgShiftHours,
				joiningDate,
				allowSelfAttendance,
				attendanceType,
				department,
				designation,
				employeeCode,
				salaryFrequency,
				emergencyContactName,
				emergencyContactPhone,
				emergencyContactRelation,
				address,
				city,
				state,
				postalCode,
				country,
				nationalId,
				dateOfBirth,
				gender,
				bankName,
				bankAccountNumber,
				bankBranchCode,
				notes,
				createStaffRecord,
				...userOnlyData
			} = userData as any;

			// Determine if we should create a staff record
			// Create staff record if any staff-related field is provided or createStaffRecord is true
			const shouldCreateStaff = createStaffRecord === true ||
				trackAttendance !== undefined ||
				allowAppAccess !== undefined ||
				calculateAs !== undefined ||
				staffSalary !== undefined ||
				avgShiftHours !== undefined ||
				joiningDate !== undefined ||
				allowSelfAttendance !== undefined ||
				attendanceType !== undefined;

			// If staff doesn't have app access, assign them the 'viewer' role
			// The viewer role has minimal permissions - just read-only access
			const VIEWER_ROLE_ID = 'viewer';
			let effectiveRoleId = userOnlyData.roleId;

			// If creating staff and no roleId provided, or allowAppAccess is false, use viewer role
			if (shouldCreateStaff) {
				if (allowAppAccess === false || !effectiveRoleId) {
					effectiveRoleId = VIEWER_ROLE_ID;
				}
			}

			userOnlyData.roleId = effectiveRoleId;

			// Generate username from email if not provided
			let generatedUsername = userOnlyData.username;
			let generatedPassword = userOnlyData.password;

			if (!generatedUsername && userOnlyData.email) {
				generatedUsername = userOnlyData.email;
			}

			// Get next user ID for password generation if needed
			if (!generatedPassword && shouldCreateStaff) {
				const nextId = await UserModel.count({}) + 1;
				generatedPassword = `password${nextId}`;
			}

			// Update userOnlyData with generated values
			userOnlyData.username = generatedUsername;
			userOnlyData.password = generatedPassword;

			this.validateUserInput(userOnlyData, true);

			const userExists = await UserModel.checkUserExists(
				userOnlyData.username!,
				userOnlyData.email || ''
			);
			if (userExists) {
				throw new ConflictError(UserErrors.USER_EXISTS, 'username');
			}

			const user = await UserModel.create({
				...userOnlyData,
				tenantId: auth.tenantId,
				branchId: userOnlyData.branchId || auth.branchId,
				status: userOnlyData.status || 'active'
			} as unknown as UserUncheckedCreateInput);

			// Create staff record if applicable
			let staffRecord = null;
			if (shouldCreateStaff) {
				try {
					staffRecord = await StaffModel.create({
						userId: user.userId,
						tenantId: auth.tenantId,
						branchId: userOnlyData.branchId || auth.branchId,
						trackAttendance: trackAttendance ?? false,
						allowAppAccess: allowAppAccess ?? false,
						calculateAs: calculateAs?.toUpperCase() || 'DAILY',
						staffSalary: staffSalary ?? 0,
						avgShiftHours: avgShiftHours ?? 8,
						joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
						allowSelfAttendance: allowSelfAttendance ?? false,
						attendanceType: attendanceType?.toUpperCase() || 'PUNCH',
						department: department || null,
						designation: designation || null,
						employeeCode: employeeCode || await StaffModel.getNextEmployeeCode(auth.tenantId),
						salaryFrequency: salaryFrequency?.toUpperCase() || 'MONTHLY',
						emergencyContactName: emergencyContactName || null,
						emergencyContactPhone: emergencyContactPhone || null,
						emergencyContactRelation: emergencyContactRelation || null,
						address: address || null,
						city: city || null,
						state: state || null,
						postalCode: postalCode || null,
						country: country || null,
						nationalId: nationalId || null,
						dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
						gender: gender?.toUpperCase() || null,
						bankName: bankName || null,
						bankAccountNumber: bankAccountNumber || null,
						bankBranchCode: bankBranchCode || null,
						notes: notes || null,
						employmentStatus: 'ACTIVE'
					});
				} catch (staffError) {
					console.error('Error creating staff record:', staffError);
					// Don't fail user creation if staff creation fails
					// Log the error but continue
				}
			}

			const publicUser = UserModel.getPublicUser(user);
			return {
				...publicUser,
				staff: staffRecord
			};
		} catch (error) {
			if (error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError) {
				throw error;
			}
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async updateUser(userId: string, userData: any, tenantId: string, branchId: string): Promise<any> {
		if (!userId) {
			throw new ValidationError('User ID is required', { userId: 'User ID field is required.' });
		}

		try {
			// Extract staff-related fields from userData
			const {
				trackAttendance,
				allowAppAccess,
				calculateAs,
				staffSalary,
				avgShiftHours,
				joiningDate,
				allowSelfAttendance,
				attendanceType,
				department,
				designation,
				employeeCode,
				salaryFrequency,
				emergencyContactName,
				emergencyContactPhone,
				emergencyContactRelation,
				address,
				city,
				state,
				postalCode,
				country,
				nationalId,
				dateOfBirth,
				gender,
				bankName,
				bankAccountNumber,
				bankBranchCode,
				notes,
				createStaffRecord,
				...userOnlyData
			} = userData;

			// Check if any staff-related field is provided
			const hasStaffFields = trackAttendance !== undefined ||
				allowAppAccess !== undefined ||
				calculateAs !== undefined ||
				staffSalary !== undefined ||
				avgShiftHours !== undefined ||
				joiningDate !== undefined ||
				allowSelfAttendance !== undefined ||
				attendanceType !== undefined ||
				department !== undefined ||
				designation !== undefined ||
				createStaffRecord === true;

			// Validate input (not a create operation)
			this.validateUserInput(userOnlyData, false);

			const existingUser = await UserModel.findById(userId, tenantId, branchId);
			if (!existingUser) {
				throw new NotFoundError('User', userId);
			}

			const updatedUserData = { ...userOnlyData };

			delete updatedUserData.repeatPassword;
			delete updatedUserData.tenantId; // Don't update tenantId
			delete updatedUserData.branchId; // Don't update branchId through this

			if (userData.password === '') {
				delete updatedUserData.password;
			}

			// Handle roleId based on allowAppAccess
			if (hasStaffFields && allowAppAccess === false) {
				updatedUserData.roleId = 'viewer';
			}

			await UserModel.update(userId, updatedUserData);

			// Handle staff record update/creation
			let staffRecord = null;
			if (hasStaffFields) {
				const existingStaff = await StaffModel.findByUserId(userId);

				const staffData: any = {};
				if (trackAttendance !== undefined) staffData.trackAttendance = trackAttendance;
				if (allowAppAccess !== undefined) staffData.allowAppAccess = allowAppAccess;
				if (calculateAs !== undefined) staffData.calculateAs = calculateAs?.toUpperCase() || 'DAILY';
				if (staffSalary !== undefined) staffData.staffSalary = staffSalary;
				if (avgShiftHours !== undefined) staffData.avgShiftHours = avgShiftHours;
				if (joiningDate !== undefined) staffData.joiningDate = joiningDate ? new Date(joiningDate) : null;
				if (allowSelfAttendance !== undefined) staffData.allowSelfAttendance = allowSelfAttendance;
				if (attendanceType !== undefined) staffData.attendanceType = attendanceType?.toUpperCase() || 'PUNCH';
				if (department !== undefined) staffData.department = department || null;
				if (designation !== undefined) staffData.designation = designation || null;
				if (employeeCode !== undefined) staffData.employeeCode = employeeCode || null;
				if (salaryFrequency !== undefined) staffData.salaryFrequency = salaryFrequency?.toUpperCase() || 'MONTHLY';
				if (emergencyContactName !== undefined) staffData.emergencyContactName = emergencyContactName || null;
				if (emergencyContactPhone !== undefined) staffData.emergencyContactPhone = emergencyContactPhone || null;
				if (emergencyContactRelation !== undefined) staffData.emergencyContactRelation = emergencyContactRelation || null;
				if (address !== undefined) staffData.address = address || null;
				if (city !== undefined) staffData.city = city || null;
				if (state !== undefined) staffData.state = state || null;
				if (postalCode !== undefined) staffData.postalCode = postalCode || null;
				if (country !== undefined) staffData.country = country || null;
				if (nationalId !== undefined) staffData.nationalId = nationalId || null;
				if (dateOfBirth !== undefined) staffData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
				if (gender !== undefined) staffData.gender = gender?.toUpperCase() || null;
				if (bankName !== undefined) staffData.bankName = bankName || null;
				if (bankAccountNumber !== undefined) staffData.bankAccountNumber = bankAccountNumber || null;
				if (bankBranchCode !== undefined) staffData.bankBranchCode = bankBranchCode || null;
				if (notes !== undefined) staffData.notes = notes || null;

				if (existingStaff) {
					// Update existing staff record
					await StaffModel.update(existingStaff.staffId, staffData);
					staffRecord = await StaffModel.findByUserId(userId);
				} else {
					// Create new staff record
					staffRecord = await StaffModel.create({
						userId,
						tenantId,
						branchId: existingUser.branchId,
						trackAttendance: trackAttendance ?? false,
						allowAppAccess: allowAppAccess ?? false,
						calculateAs: calculateAs?.toUpperCase() || 'DAILY',
						staffSalary: staffSalary ?? 0,
						avgShiftHours: avgShiftHours ?? 8,
						joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
						allowSelfAttendance: allowSelfAttendance ?? false,
						attendanceType: attendanceType?.toUpperCase() || 'PUNCH',
						department: department || null,
						designation: designation || null,
						employeeCode: employeeCode || await StaffModel.getNextEmployeeCode(tenantId),
						salaryFrequency: salaryFrequency?.toUpperCase() || 'MONTHLY',
						emergencyContactName: emergencyContactName || null,
						emergencyContactPhone: emergencyContactPhone || null,
						emergencyContactRelation: emergencyContactRelation || null,
						address: address || null,
						city: city || null,
						state: state || null,
						postalCode: postalCode || null,
						country: country || null,
						nationalId: nationalId || null,
						dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
						gender: gender?.toUpperCase() || null,
						bankName: bankName || null,
						bankAccountNumber: bankAccountNumber || null,
						bankBranchCode: bankBranchCode || null,
						notes: notes || null,
						employmentStatus: 'ACTIVE'
					});
				}
			} else {
				// Check if staff record exists and include it in response
				staffRecord = await StaffModel.findByUserId(userId);
			}

			const updatedUser = await UserModel.findById(userId, tenantId, branchId);
			const publicUser = UserModel.getPublicUser(updatedUser!);

			return {
				...publicUser,
				staff: staffRecord
			};
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