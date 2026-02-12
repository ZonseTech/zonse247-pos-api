import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import type {
    Staff,
    StaffQueryParams,
    CreateStaffRequest,
    StaffWithUser
} from '../types/staff';

export class StaffModel {
    /**
     * Find all staff members based on conditions
     */
    static async findAll(conditions: StaffQueryParams = {}): Promise<Staff[]> {
        try {
            return await prisma.staff.findMany({
                where: conditions,
                orderBy: { createdAt: 'desc' }
            }) as unknown as Staff[];
        } catch (error) {
            throw new Error(`Error finding staff: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find staff by ID
     */
    static async findById(staffId: string, tenantId?: string, branchId?: string): Promise<Staff | null> {
        try {
            const staff = await prisma.staff.findUnique({
                where: { staffId }
            }) as unknown as Staff | null;

            if (staff) {
                if (tenantId && staff.tenantId !== tenantId) return null;
                if (branchId && staff.branchId !== branchId) return null;
            }
            return staff;
        } catch (error) {
            throw new Error(`Error finding staff by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find staff by user ID
     */
    static async findByUserId(userId: string): Promise<Staff | null> {
        try {
            return await prisma.staff.findUnique({
                where: { userId }
            }) as unknown as Staff | null;
        } catch (error) {
            throw new Error(`Error finding staff by user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find staff by tenant ID
     */
    static async findByTenantId(tenantId: string): Promise<Staff[]> {
        try {
            return await prisma.staff.findMany({
                where: { tenantId }
            }) as unknown as Staff[];
        } catch (error) {
            throw new Error(`Error finding staff by tenant ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find staff by branch ID
     */
    static async findByBranchId(branchId: string, tenantId?: string): Promise<Staff[]> {
        try {
            const where: any = { branchId };
            if (tenantId) where.tenantId = tenantId;

            return await prisma.staff.findMany({
                where
            }) as unknown as Staff[];
        } catch (error) {
            throw new Error(`Error finding staff by branch ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find staff by employment status
     */
    static async findByEmploymentStatus(status: string, tenantId?: string, branchId?: string): Promise<Staff[]> {
        try {
            const where: any = { employmentStatus: status };
            if (tenantId) where.tenantId = tenantId;
            if (branchId) where.branchId = branchId;

            return await prisma.staff.findMany({
                where
            }) as unknown as Staff[];
        } catch (error) {
            throw new Error(`Error finding staff by employment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find staff with user details
     */
    static async findWithUser(staffId: string, tenantId?: string, branchId?: string): Promise<StaffWithUser | null> {
        try {
            const staff = await prisma.staff.findUnique({
                where: { staffId },
                include: {
                    user: {
                        select: {
                            userId: true,
                            username: true,
                            fullname: true,
                            email: true,
                            phone: true,
                            roleId: true,
                            status: true
                        }
                    }
                }
            }) as unknown as StaffWithUser | null;

            if (staff) {
                if (tenantId && staff.tenantId !== tenantId) return null;
                if (branchId && staff.branchId !== branchId) return null;
            }
            return staff;
        } catch (error) {
            throw new Error(`Error finding staff with user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find all staff with user details
     */
    static async findAllWithUser(tenantId: string, branchId?: string): Promise<StaffWithUser[]> {
        try {
            const where: any = { tenantId };
            if (branchId) where.branchId = branchId;

            return await prisma.staff.findMany({
                where,
                include: {
                    user: {
                        select: {
                            userId: true,
                            username: true,
                            fullname: true,
                            email: true,
                            phone: true,
                            roleId: true,
                            status: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }) as unknown as StaffWithUser[];
        } catch (error) {
            throw new Error(`Error finding all staff with user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Build staff data for creation
     */
    static buildStaffData(data: CreateStaffRequest) {
        const now = new Date();

        return {
            staffId: uuidv4(),
            userId: data.userId,
            tenantId: data.tenantId,
            branchId: data.branchId,
            employeeCode: data.employeeCode || null,
            department: data.department || null,
            designation: data.designation || null,
            joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
            calculateAs: data.calculateAs || 'DAILY',
            staffSalary: data.staffSalary || 0,
            salaryFrequency: data.salaryFrequency || 'MONTHLY',
            trackAttendance: data.trackAttendance || false,
            allowSelfAttendance: data.allowSelfAttendance || false,
            attendanceType: data.attendanceType || 'PUNCH',
            avgShiftHours: data.avgShiftHours || 8,
            allowAppAccess: data.allowAppAccess || false,
            emergencyContactName: data.emergencyContactName || null,
            emergencyContactPhone: data.emergencyContactPhone || null,
            emergencyContactRelation: data.emergencyContactRelation || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            postalCode: data.postalCode || null,
            country: data.country || null,
            nationalId: data.nationalId || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            gender: data.gender || null,
            bankName: data.bankName || null,
            bankAccountNumber: data.bankAccountNumber || null,
            bankBranchCode: data.bankBranchCode || null,
            employmentStatus: data.employmentStatus || 'ACTIVE',
            notes: data.notes || null,
            synced: 0,
            createdAt: now,
            updatedAt: now
        };
    }

    /**
     * Check if staff exists
     */
    static async exists(staffId: string): Promise<boolean> {
        try {
            const count = await prisma.staff.count({
                where: { staffId }
            });
            return count > 0;
        } catch (error) {
            console.error('Error checking if staff exists:', error);
            return false;
        }
    }

    /**
     * Check if user already has staff record
     */
    static async existsByUserId(userId: string): Promise<boolean> {
        try {
            const count = await prisma.staff.count({
                where: { userId }
            });
            return count > 0;
        } catch (error) {
            console.error('Error checking if staff exists by user ID:', error);
            return false;
        }
    }

    /**
     * Insert staff record directly
     */
    static async insert(data: Staff): Promise<Staff> {
        try {
            return await prisma.staff.create({
                data: data as any
            }) as unknown as Staff;
        } catch (error) {
            throw new Error(`Error inserting staff: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create a new staff record
     */
    static async create(staffData: CreateStaffRequest): Promise<Staff> {
        try {
            const staff = this.buildStaffData(staffData);
            return await prisma.staff.create({
                data: staff as any
            }) as unknown as Staff;
        } catch (error) {
            throw new Error(`Error creating staff: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update staff record
     */
    static async update(staffId: string, updateData: Partial<Staff>): Promise<number> {
        try {
            const updateDataWithTimestamp: any = {
                ...updateData,
                updatedAt: new Date()
            };

            delete updateDataWithTimestamp.staffId;
            delete updateDataWithTimestamp.userId;
            delete updateDataWithTimestamp.createdAt;

            // Convert dates if provided
            if (updateData.joiningDate) {
                updateDataWithTimestamp.joiningDate = new Date(updateData.joiningDate);
            }
            if (updateData.terminationDate) {
                updateDataWithTimestamp.terminationDate = new Date(updateData.terminationDate);
            }
            if (updateData.dateOfBirth) {
                updateDataWithTimestamp.dateOfBirth = new Date(updateData.dateOfBirth);
            }

            await prisma.staff.update({
                where: { staffId },
                data: updateDataWithTimestamp
            });

            return 1;
        } catch (error) {
            throw new Error(`Error updating staff: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update staff by user ID
     */
    static async updateByUserId(userId: string, updateData: Partial<Staff>): Promise<number> {
        try {
            const updateDataWithTimestamp: any = {
                ...updateData,
                updatedAt: new Date()
            };

            delete updateDataWithTimestamp.staffId;
            delete updateDataWithTimestamp.userId;
            delete updateDataWithTimestamp.createdAt;

            await prisma.staff.update({
                where: { userId },
                data: updateDataWithTimestamp
            });

            return 1;
        } catch (error) {
            throw new Error(`Error updating staff by user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete staff record
     */
    static async delete(staffId: string): Promise<number> {
        try {
            await prisma.staff.delete({
                where: { staffId }
            });
            return 1;
        } catch (error) {
            throw new Error(`Error deleting staff: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete staff by user ID
     */
    static async deleteByUserId(userId: string): Promise<number> {
        try {
            await prisma.staff.delete({
                where: { userId }
            });
            return 1;
        } catch (error) {
            throw new Error(`Error deleting staff by user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Count staff records
     */
    static async count(conditions: StaffQueryParams = {}): Promise<number> {
        try {
            return await prisma.staff.count({
                where: conditions
            });
        } catch (error) {
            throw new Error(`Error counting staff: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get the next employee code for a tenant
     */
    static async getNextEmployeeCode(tenantId: string, prefix = 'EMP'): Promise<string> {
        try {
            const count = await prisma.staff.count({
                where: { tenantId }
            });
            const nextNumber = count + 1;
            return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
        } catch (error) {
            throw new Error(`Error generating employee code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get next auto-increment ID
     */
    static async getNextId(): Promise<number> {
        try {
            const lastStaff = await prisma.staff.findFirst({
                orderBy: { id: 'desc' },
                select: { id: true }
            });
            return (lastStaff?.id || 0) + 1;
        } catch (error) {
            throw new Error(`Error getting next staff ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
