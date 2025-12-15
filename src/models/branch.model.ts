import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import { Branch, BranchStatus, CreateBranchRequest, MraApprovalStatus } from 'branch';
import { BranchMRAApprovalStatus } from '../databases/prisma/generated/prisma/enums';
import { BranchCreateInput } from 'src/databases/prisma/generated/prisma/models';

export class BranchModel {
    static async findAll(conditions = {}): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: conditions
        });
    }

    static async findByTenantId(tenantId: string): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { tenantId }
        });
    }

    static async findByBranchCode(branchCode: string): Promise<Branch | null> {
        return await prisma.branch.findFirst({
            where: { branchCode }
        });
    }

    static async findByTenantIdAndBranchCode(tenantId: string, branchCode: string): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { tenantId, branchCode }
        });
    }

    static async findById(branchId: string): Promise<Branch | null> {
        return await prisma.branch.findUnique({
            where: { branchId }
        });
    }

    static async exists(branchId: string, tenantId: string): Promise<boolean> {
        const branch = await prisma.branch.findFirst({
            where: { branchId, tenantId }
        });
        return !!branch;
    }

    static async create(branchData: BranchCreateInput) {
        return await prisma.branch.create({
            data: {
                ...branchData,
                branchId: branchData.branchId || uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        }) as unknown as Branch;
    }

    // Insert branch (alias for create)
    static async insert(data: Branch): Promise<Branch> {
        return await prisma.branch.create({
            data: {
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        }) as unknown as Branch;
    }

    static async update(branchId: string, data: Partial<Branch>): Promise<Branch> {
        const updateData = this.buildUpdateData(data);

        return await prisma.branch.update({
            where: { branchId },
            data: updateData
        }) as unknown as Branch;
    }

    static async delete(branchId: string): Promise<Branch> {
        return await prisma.branch.delete({
            where: { branchId }
        }) as unknown as Branch;
    }

    static async count(conditions = {}): Promise<number> {
        return await prisma.branch.count({
            where: conditions
        });
    }

    static async findByStatus(status: BranchStatus): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { status }
        });
    }

    // Find branches by city
    static async findByCity(city: string): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { city }
        });
    }

    // Find branches by state
    static async findByState(state: string): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { state }
        });
    }

    // Find branches by district
    static async findByDistrict(district: string): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { district }
        });
    }

    // Find active branches
    static async findActiveBranches(): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { isActive: true }
        });
    }

    // Find active branches by tenant ID
    static async findActiveBranchesByTenantId(tenantId: string): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { tenantId, isActive: true }
        });
    }

    // Find branches by status
    static async findBranchesByStatus(status: BranchStatus): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { status }
        });
    }

    // Find virtual warehouses
    static async findVirtualWarehouses(tenantId?: string): Promise<Branch[]> {
        const where: { tenantId?: string; isVirtualWarehouse: boolean } = { isVirtualWarehouse: true };

        if (tenantId) {
            where.tenantId = tenantId;
        }
        return await prisma.branch.findMany({ where });
    }

    // Find branches by MRA approval status
    static async findByMraApprovalStatus(status: MraApprovalStatus): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { mraApprovalStatus: status }
        });
    }

    // Get branches by email domain
    static async getBranchesByEmailDomain(domain: string): Promise<Branch[]> {
        const branches = await prisma.branch.findMany();
        return branches.filter((branch: any) =>
            branch.email && branch.email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)
        );
    }

    // Get unsynced branches
    static async getUnsyncedBranches(): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { synced: 0 }
        });
    }

    // Mark branch as synced
    static async markAsSynced(branchId: string): Promise<Branch> {
        return await prisma.branch.update({
            where: { branchId },
            data: { synced: 1, updatedAt: new Date() }
        }) as unknown as Branch;
    }

    // Clear all branches
    static async clearAllBranches(): Promise<{ count: number }> {
        return await prisma.branch.deleteMany({});
    }

    // Find by email
    static async findByEmail(email: string): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { email }
        });
    }

    // Find by phone number
    static async findByPhone(phoneNumber: string): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { phoneNumber }
        });
    }

    // Find by site ID
    static async findBySiteId(siteId: string): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { siteId }
        });
    }

    // Find branches with pagination
    static async findBranchesWithPagination(
        conditions = {},
        page = 1,
        limit = 10
    ): Promise<{ branches: Branch[], total: number, page: number, limit: number }> {
        const skip = (page - 1) * limit;

        const [branches, total] = await Promise.all([
            prisma.branch.findMany({
                where: conditions,
                skip,
                take: limit
            }),
            prisma.branch.count({ where: conditions })
        ]);

        return {
            branches,
            total,
            page,
            limit
        };
    }

    // Find branches with sorting
    static async findBranchesWithSorting(
        conditions = {},
        sortBy = 'branchName',
        sortOrder: 'asc' | 'desc' = 'asc'
    ): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: conditions,
            orderBy: { [sortBy]: sortOrder }
        });
    }

    static buildBranchData(data: CreateBranchRequest) {
        const now = new Date();

        return {
            branchId: data.branchId || uuidv4(),
            tenantId: data.tenantId,
            branchCode: data.branchCode || 'BR001',
            branchName: data.branchName,
            siteId: data.siteId || null,
            siteName: data.siteName || null,
            description: data.description || null,
            addressLine1: data.addressLine1 || null,
            addressLine2: data.addressLine2 || null,
            addressLine3: data.addressLine3 || null,
            district: data.district || null,
            city: data.city || null,
            state: data.state || null,
            postalCode: data.postalCode || null,
            phoneNumber: data.phoneNumber || null,
            email: data.email || null,
            taxRate: data.taxRate || 0.00,
            chargeTax: data.chargeTax || false,
            receiptFooter: data.receiptFooter || null,
            logoUrl: data.logoUrl || null,
            currencyCode: data.currencyCode || 'MWK',
            currencySymbol: data.currencySymbol || 'K',
            isVirtualWarehouse: data.isVirtualWarehouse || false,
            isActive: data.isActive !== undefined ? data.isActive : true,
            status: (data.status as BranchStatus) || 'active',
            mraApprovalStatus: data.mraApprovalStatus || BranchMRAApprovalStatus.PENDING,
            synced: data.synced || 0,
            createdAt: now,
            updatedAt: now,
            mraApprovalDate: null
        };
    }

    // Build update data (excluding non-updateable fields)
    static buildUpdateData(data: Partial<Branch>): Partial<Branch> {
        return {
            ...data,
            updatedAt: new Date()
        };
    }

    // Validate branch data
    validateBranchData(data: Partial<Branch>): string | null {
        if (data.email && !this.isValidEmail(data.email)) {
            return 'Invalid email format';
        }

        if (data.taxRate !== undefined && (data.taxRate < 0 || data.taxRate > 100)) {
            return 'Tax rate must be between 0 and 100';
        }

        if (data.status && !['active', 'inactive', 'suspended'].includes(data.status)) {
            return 'Invalid status. Must be active, inactive, or suspended';
        }

        if (data.phoneNumber && data.phoneNumber.length > 20) {
            return 'Phone number too long';
        }

        if (data.branchCode && !/^[A-Za-z0-9_-]+$/.test(data.branchCode)) {
            return 'Branch code can only contain letters, numbers, hyphens, and underscores';
        }

        if (data.mraApprovalStatus && !['PENDING', 'APPROVED', 'REJECTED'].includes(data.mraApprovalStatus)) {
            return 'Invalid MRA approval status. Must be PENDING, APPROVED, or REJECTED';
        }

        return null;
    }

    // Email validation helper
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}