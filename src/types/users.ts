export interface User {
    userId: string;
    tenantId: string;
    branchId: string;
    username: string;
    password: string;
    fullname: string;
    email?: string | null;
    departmentId?: string | null;
    departmentName?: string | null;
    phone?: string | null;
    roleId: string;
    roleName?: string | null;
    status?: UserStatus;
    accessibleBranches?: string[] | null;
    allowedTerminals?: string[] | null;
    maxDiscountPercent?: number;
    canOverridePrices?: boolean;
    pinCode?: string | null;
    currentBranchId?: string | null;
    lastLogin?: Date | null;
    lastLogout?: Date | null;
    passwordChangedAt?: Date;
    forcePasswordChange?: boolean;
    roles?: Array<string>;
    permissions?: Array<string>;
    synced?: 0 | 1,
    createdAt?: Date;
    updatedAt?: Date;
}

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface PublicUser extends Omit<User, 'password'> {
    roleName?: string;
    permissions?: string[];
}

export interface UserQueryParams {
    tenantId?: string;
    branchId?: string;
    roleId?: string;
    status?: UserStatus;
    currentBranchId?: string;
    forcePasswordChange?: boolean;
    synced?: number;
}

export interface CreateUserRequest {
    tenantId: string;
    branchId: string;
    username: string;
    password: string;
    fullname: string;
    email?: string | null;
    phone?: string | null;
    roleId: string;
    status?: UserStatus;
    accessibleBranches?: string[] | null;
    allowedTerminals?: string[] | null;
    maxDiscountPercent?: number;
    canOverridePrices?: boolean;
    pinCode?: string | null;
    currentBranchId?: string | null;
    forcePasswordChange?: boolean;

    // Staff-related fields for creating staff record alongside user
    trackAttendance?: boolean;
    allowAppAccess?: boolean;
    calculateAs?: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'FIXED';
    staffSalary?: number;
    avgShiftHours?: number;
    joiningDate?: Date | string | null;
    allowSelfAttendance?: boolean;
    attendanceType?: 'PUNCH' | 'SHIFT' | 'FLEXIBLE' | 'REMOTE';
    department?: string | null;
    designation?: string | null;
    employeeCode?: string | null;
    salaryFrequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'SEMIMONTHLY';
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    nationalId?: string | null;
    dateOfBirth?: Date | string | null;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankBranchCode?: string | null;
    notes?: string | null;

    // Flag to create staff record
    createStaffRecord?: boolean;
}