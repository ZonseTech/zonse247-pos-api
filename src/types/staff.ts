export type StaffSalaryType = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'FIXED';
export type SalaryFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'SEMIMONTHLY';
export type AttendanceType = 'PUNCH' | 'SHIFT' | 'FLEXIBLE' | 'REMOTE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED' | 'RESIGNED';

export interface Staff {
    staffId: string;
    userId: string;
    tenantId: string;
    branchId: string;

    // Staff employment details
    employeeCode?: string | null;
    department?: string | null;
    designation?: string | null;
    joiningDate?: Date | null;
    terminationDate?: Date | null;

    // Salary and compensation
    calculateAs: StaffSalaryType;
    staffSalary: number;
    salaryFrequency: SalaryFrequency;

    // Attendance settings
    trackAttendance: boolean;
    allowSelfAttendance: boolean;
    attendanceType: AttendanceType;
    avgShiftHours: number;

    // Access permissions
    allowAppAccess: boolean;

    // Emergency contact
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;

    // Additional staff info
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    nationalId?: string | null;
    dateOfBirth?: Date | null;
    gender?: Gender | null;

    // Bank details for salary
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankBranchCode?: string | null;

    // Status
    employmentStatus: EmploymentStatus;
    notes?: string | null;

    synced?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface StaffQueryParams {
    tenantId?: string;
    branchId?: string;
    userId?: string;
    employmentStatus?: EmploymentStatus;
    department?: string;
    calculateAs?: StaffSalaryType;
    trackAttendance?: boolean;
}

export interface CreateStaffRequest {
    userId: string;
    tenantId: string;
    branchId: string;
    employeeCode?: string;
    department?: string;
    designation?: string;
    joiningDate?: Date | string;
    calculateAs?: StaffSalaryType;
    staffSalary?: number;
    salaryFrequency?: SalaryFrequency;
    trackAttendance?: boolean;
    allowSelfAttendance?: boolean;
    attendanceType?: AttendanceType;
    avgShiftHours?: number;
    allowAppAccess?: boolean;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    nationalId?: string;
    dateOfBirth?: Date | string;
    gender?: Gender;
    bankName?: string;
    bankAccountNumber?: string;
    bankBranchCode?: string;
    employmentStatus?: EmploymentStatus;
    notes?: string;
}

export interface CreateStaffFromUserRequest {
    fullname: string;
    email: string;
    tenantId?: string;
    branchId?: string;
    roleId: string;
    trackAttendance?: boolean;
    allowAppAccess?: boolean;
    calculateAs?: StaffSalaryType;
    staffSalary?: number;
    avgShiftHours?: number;
    joiningDate?: Date | string;
    allowSelfAttendance?: boolean;
    attendanceType?: AttendanceType;
    department?: string;
    designation?: string;
    employeeCode?: string;
    salaryFrequency?: SalaryFrequency;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    nationalId?: string;
    dateOfBirth?: Date | string;
    gender?: Gender;
    bankName?: string;
    bankAccountNumber?: string;
    bankBranchCode?: string;
    notes?: string;
}

export type UpdateStaffRequest = Partial<Omit<CreateStaffRequest, 'userId' | 'tenantId'>>;

export interface StaffWithUser extends Staff {
    user?: {
        userId: string;
        username: string;
        fullname: string;
        email?: string | null;
        phone?: string | null;
        roleId: string;
        status?: string;
    };
}
