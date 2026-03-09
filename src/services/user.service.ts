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
	UserErrors,
} from '../utils/db-error-handler.util';
import { AuthScopeParams } from 'auth';

export class UserService {

	static async getAllUsers(query?: any, scope?: AuthScopeParams): Promise<any[]> {
		try {
			let users: Array<User>;

			if (query && Object.keys(query).length > 0) {
				const searchCriteria: any = {};

				if (scope?.tenantId) searchCriteria.tenantId = scope.tenantId;
				if (scope?.branchId) searchCriteria.branchId = scope.branchId;

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
				if (scope?.tenantId) searchCriteria.tenantId = scope.tenantId;
				if (scope?.branchId) searchCriteria.branchId = scope.branchId;
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

	static validateUserInput(userData: Partial<User>, isCreate = true): void {
		const errors: Record<string, string> = {};

		if (isCreate) {
			if ((!userData.username || userData.username.trim().length === 0) &&
				(!userData.email || userData.email.trim().length === 0)) {
				errors.username = UserErrors.USERNAME_REQUIRED;
			}

			if (!userData.fullname || userData.fullname.trim().length === 0) {
				errors.fullname = UserErrors.FULLNAME_REQUIRED;
			}

			if (!userData.roleId) {
				errors.roleId = UserErrors.ROLE_REQUIRED;
			}

			if (userData.password !== undefined && userData.password !== null && userData.password.length > 0 && userData.password.length < 6) {
				errors.password = UserErrors.PASSWORD_TOO_SHORT(6);
			}
		}

		if (userData.email && !validator.isEmail(userData.email)) {
			errors.email = UserErrors.INVALID_EMAIL;
		}

		if (userData.status && !['active', 'inactive', 'suspended'].includes(userData.status)) {
			errors.status = UserErrors.INVALID_STATUS;
		}

		if (Object.keys(errors).length > 0) {
			throw new ValidationError('User validation failed', errors);
		}
	}

	static async getUserById(userId: string): Promise<any> {
		if (!userId) {
			throw new ValidationError('User ID is required', { userId: UserErrors.USER_NOT_FOUND(userId) });
		}

		try {
			const user = await UserModel.findById(userId);
			if (!user) {
				throw new NotFoundError('User', userId);
			}
			return this.getPublicUser(user, await this.getRoleWithPermissions(user.roleId) || {});
		} catch (error) {
			if (error instanceof NotFoundError || error instanceof ValidationError) {
				throw error;
			}
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async createUser(userData: Partial<User>): Promise<any> {
		try {
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

			const shouldCreateStaff = createStaffRecord === true ||
				trackAttendance !== undefined ||
				allowAppAccess !== undefined ||
				calculateAs !== undefined ||
				staffSalary !== undefined ||
				avgShiftHours !== undefined ||
				joiningDate !== undefined ||
				allowSelfAttendance !== undefined ||
				attendanceType !== undefined;

			const VIEWER_ROLE_ID = 'viewer';
			let effectiveRoleId = userOnlyData.roleId;

			if (shouldCreateStaff) {
				if (allowAppAccess === false || !effectiveRoleId) {
					effectiveRoleId = VIEWER_ROLE_ID;
				}
			} else {
				if (!effectiveRoleId) {
					throw new ValidationError('Role is required when creating a user', { roleId: 'roleId is required for user creation' });
				}
			}

			const role = await RoleModel.findById(effectiveRoleId);
			if (!role) {
				throw new ValidationError('Invalid role', { roleId: `Role '${effectiveRoleId}' does not exist` });
			}

			userOnlyData.roleId = effectiveRoleId;

			let generatedUsername = userOnlyData.username;
			let generatedPassword = userOnlyData.password;

			if (!generatedUsername && userOnlyData.email) {
				generatedUsername = userOnlyData.email.split('@')[0];
			}

			if (!generatedPassword && shouldCreateStaff) {
				const nextId = await UserModel.count({}) + 1;
				generatedPassword = `password${nextId}`;
			}

			userOnlyData.username = generatedUsername;
			userOnlyData.password = generatedPassword;

			this.validateUserInput(userOnlyData, true);

			const userExists = await UserModel.checkUserExists(
				userOnlyData.username,
				userOnlyData.email || ''
			);
			if (userExists) {
				throw new ConflictError(UserErrors.USER_EXISTS, 'username');
			}

			const user = await UserModel.create({
				...userOnlyData,
				tenantId: userOnlyData.tenantId,
				branchId: userOnlyData.branchId,
				status: userOnlyData.status || 'active'
			} as unknown as UserUncheckedCreateInput);

			let staffRecord = null;
			if (shouldCreateStaff) {
				try {
					staffRecord = await StaffModel.create({
						userId: user.userId,
						tenantId: userOnlyData.tenantId,
						branchId: userOnlyData.branchId,
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
						employeeCode: employeeCode || await StaffModel.getNextEmployeeCode(userOnlyData.tenantId),
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
				} catch {
					// Log the error but continue
				}
			}

			const publicUser = UserModel.getPublicUser(user);
			return {
				...publicUser,
				staff: staffRecord,
				generatedPassword: shouldCreateStaff ? generatedPassword : undefined
			};
		} catch (error) {
			if (error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError) {
				throw error;
			}
			throw DbErrorHandler.handlePrismaError(error);
		}
	}

	static async updateUser(userId: string, userData: any): Promise<any> {
		if (!userId) {
			throw new ValidationError('User ID is required', { userId: 'User ID field is required.' });
		}

		try {
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

			this.validateUserInput(userOnlyData, false);

			const existingUser = await UserModel.findById(userId);
			if (!existingUser) {
				throw new NotFoundError('User', userId);
			}

			const updatedUserData = { ...userOnlyData };

			delete updatedUserData.repeatPassword;
			delete updatedUserData.tenantId;
			delete updatedUserData.branchId;

			if (userData.password === '') {
				delete updatedUserData.password;
			}

			if (hasStaffFields && allowAppAccess === false) {
				updatedUserData.roleId = 'viewer';
			}

			if (updatedUserData.roleId) {
				const role = await RoleModel.findById(updatedUserData.roleId);
				if (!role) {
					throw new ValidationError('Invalid role', { roleId: `Role '${updatedUserData.roleId}' does not exist` });
				}
			}

			await UserModel.update(userId, updatedUserData);

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
					await StaffModel.update(existingStaff.staffId, staffData);
					staffRecord = await StaffModel.findByUserId(userId);
				} else {
					staffRecord = await StaffModel.create({
						userId,
						tenantId: existingUser.tenantId,
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
						employeeCode: employeeCode || await StaffModel.getNextEmployeeCode(existingUser.tenantId),
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
				staffRecord = await StaffModel.findByUserId(userId);
			}

			const updatedUser = await UserModel.findById(userId);
			const publicUser = UserModel.getPublicUser(updatedUser);

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

	static async deleteUser(userId: string): Promise<void> {
		if (!userId) {
			throw new ValidationError('User ID is required', { userId: 'User ID field is required.' });
		}

		try {
			const user = await UserModel.findById(userId);
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