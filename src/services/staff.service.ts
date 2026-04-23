import prisma from '../databases/prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { buildPaginationMeta } from '../utils/pagination.utils';
import { CreateStaffRequest, UpdateStaffRequest, EmploymentStatus } from '../types/staff';

interface PaginationParams {
  skip: number;
  limit: number;
  page: number;
}

interface StaffFilters {
  employmentStatus?: EmploymentStatus;
  department?: string;
  search?: string;
}

const USER_SELECT = {
  userId: true,
  username: true,
  fullname: true,
  email: true,
  phone: true,
  roleId: true,
  status: true,
};

// ==========================================
// Staff Service
// ==========================================
export class StaffService {
  /**
   * Create a staff record for an existing user
   */
  static async createStaff(data: CreateStaffRequest, tenantId: string, branchId: string) {
    // Verify user exists
    const user = await prisma.user.findFirst({
      where: { userId: data.userId, tenantId, deletedAt: null },
    });
    if (!user) throw new Error('User not found or does not belong to this tenant');

    // Check if user already has a staff record
    const existing = await prisma.staff.findUnique({
      where: { userId: data.userId },
    });
    if (existing) throw new Error('This user already has a staff record');

    return prisma.staff.create({
      data: {
        staffId: uuidv4(),
        userId: data.userId,
        tenantId,
        branchId,
        employeeCode: data.employeeCode ?? null,
        department: data.department ?? null,
        designation: data.designation ?? null,
        joiningDate: data.joiningDate ? new Date(data.joiningDate as string) : null,
        calculateAs: data.calculateAs ?? 'DAILY',
        staffSalary: data.staffSalary ?? 0,
        salaryFrequency: data.salaryFrequency ?? 'MONTHLY',
        trackAttendance: data.trackAttendance ?? false,
        allowSelfAttendance: data.allowSelfAttendance ?? false,
        attendanceType: data.attendanceType ?? 'PUNCH',
        avgShiftHours: data.avgShiftHours ?? 8,
        allowAppAccess: data.allowAppAccess ?? false,
        emergencyContactName: data.emergencyContactName ?? null,
        emergencyContactPhone: data.emergencyContactPhone ?? null,
        emergencyContactRelation: data.emergencyContactRelation ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        postalCode: data.postalCode ?? null,
        country: data.country ?? null,
        nationalId: data.nationalId ?? null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth as string) : null,
        gender: data.gender ?? null,
        bankName: data.bankName ?? null,
        bankAccountNumber: data.bankAccountNumber ?? null,
        bankBranchCode: data.bankBranchCode ?? null,
        employmentStatus: data.employmentStatus ?? 'ACTIVE',
        notes: data.notes ?? null,
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  /**
   * List staff with pagination
   */
  static async listStaff(tenantId: string, branchId: string, filters: StaffFilters, pagination: PaginationParams) {
    const where: any = { tenantId, branchId, deletedAt: null };

    if (filters.employmentStatus) where.employmentStatus = filters.employmentStatus;
    if (filters.department) where.department = filters.department;
    if (filters.search) {
      where.OR = [
        { employeeCode: { contains: filters.search } },
        { department: { contains: filters.search } },
        { designation: { contains: filters.search } },
        { user: { fullname: { contains: filters.search } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        include: { user: { select: USER_SELECT } },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.staff.count({ where }),
    ]);

    return { data, pagination: buildPaginationMeta(total, pagination.page, pagination.limit) };
  }

  /**
   * Get staff by staffId
   */
  static async getStaffById(staffId: string, tenantId: string, branchId: string) {
    return prisma.staff.findFirst({
      where: { staffId, tenantId, branchId, deletedAt: null },
      include: { user: { select: USER_SELECT } },
    });
  }

  /**
   * Update a staff record
   */
  static async updateStaff(staffId: string, tenantId: string, branchId: string, data: UpdateStaffRequest) {
    const staff = await prisma.staff.findFirst({
      where: { staffId, tenantId, branchId, deletedAt: null },
    });
    if (!staff) throw new Error('Staff not found');

    return prisma.staff.update({
      where: { staffId },
      data: {
        ...(data.employeeCode !== undefined && { employeeCode: data.employeeCode }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.designation !== undefined && { designation: data.designation }),
        ...(data.joiningDate !== undefined && { joiningDate: data.joiningDate ? new Date(data.joiningDate as string) : null }),
        ...(data.calculateAs !== undefined && { calculateAs: data.calculateAs }),
        ...(data.staffSalary !== undefined && { staffSalary: data.staffSalary }),
        ...(data.salaryFrequency !== undefined && { salaryFrequency: data.salaryFrequency }),
        ...(data.trackAttendance !== undefined && { trackAttendance: data.trackAttendance }),
        ...(data.allowSelfAttendance !== undefined && { allowSelfAttendance: data.allowSelfAttendance }),
        ...(data.attendanceType !== undefined && { attendanceType: data.attendanceType }),
        ...(data.avgShiftHours !== undefined && { avgShiftHours: data.avgShiftHours }),
        ...(data.allowAppAccess !== undefined && { allowAppAccess: data.allowAppAccess }),
        ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName }),
        ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: data.emergencyContactPhone }),
        ...(data.emergencyContactRelation !== undefined && { emergencyContactRelation: data.emergencyContactRelation }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.nationalId !== undefined && { nationalId: data.nationalId }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth as string) : null }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.bankAccountNumber !== undefined && { bankAccountNumber: data.bankAccountNumber }),
        ...(data.bankBranchCode !== undefined && { bankBranchCode: data.bankBranchCode }),
        ...(data.employmentStatus !== undefined && { employmentStatus: data.employmentStatus }),
        ...(data.notes !== undefined && { notes: data.notes }),
        version: { increment: 1 },
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  /**
   * Soft-delete a staff record
   */
  static async deleteStaff(staffId: string, tenantId: string, branchId: string) {
    const staff = await prisma.staff.findFirst({
      where: { staffId, tenantId, branchId, deletedAt: null },
    });
    if (!staff) throw new Error('Staff not found');

    return prisma.staff.update({
      where: { staffId },
      data: { deletedAt: new Date() },
    });
  }
}
