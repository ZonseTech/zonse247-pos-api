import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from '../databases/local';
import { BRANCHES_TABLE, } from '../databases/local/tables';
import { Branch, BranchStatus, CreateBranchRequest, MraApprovalStatus } from 'branch';

export class BranchModel {

    static async findAll(conditions: any = {}): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, conditions);
    }

    static async findByTenantId(tenantId: string): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { tenantId });
    }

    static async findByBranchCode(branchCode: string): Promise<Branch | null> {
        return sealDBModel.findById(BRANCHES_TABLE, { branchCode });
    }

    static async findByTenantIdAndBranchCode(tenantId: string, branchCode: string): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { tenantId, branchCode });
    }

    static async findById(branchId: string): Promise<Branch | null> {
        return sealDBModel.findById(BRANCHES_TABLE, branchId);
    }

    static async exists(branchId: string, tenantId: string): Promise<boolean> {
        const result = await sealDBModel.findById(BRANCHES_TABLE, { tenantId, branchId });

        if (!result || typeof result !== 'object') {
            return false;
        }

        const hasKeys = Object.keys(result).length > 0;

        return hasKeys
    }

    static async create(branchData: Omit<Branch, 'branchId'>): Promise<Branch> {
        return sealDBModel.insert(BRANCHES_TABLE, branchData);
    }

    static async insert(data: Branch): Promise<Branch> {
        return await sealDBModel.insert(BRANCHES_TABLE, data);
    }

    static async update(branchId: string, data: Partial<Branch>): Promise<number> {
        return sealDBModel.update(BRANCHES_TABLE, branchId, data);
    }

    static async delete(branchId: string): Promise<number> {
        return sealDBModel.delete(BRANCHES_TABLE, branchId);
    }

    static async count(conditions: any = {}): Promise<number> {
        return sealDBModel.count(BRANCHES_TABLE, conditions);
    }

    static async findByStatus(status: BranchStatus): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { status });
    }

    static async findByCity(city: string): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { city });
    }

    static async findByState(state: string): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { state });
    }

    static async findByDistrict(district: string): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { district });
    }

    static async findActiveBranches(): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { isActive: true });
    }

    static async findActiveBranchesByTenantId(tenantId: string): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { tenantId, isActive: true });
    }

    static async findBranchesByStatus(status: BranchStatus): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { status });
    }

    static async findVirtualWarehouses(tenantId?: string): Promise<Branch[]> {
        const conditions: any = { isVirtualWarehouse: true };
        if (tenantId) {
            conditions.tenantId = tenantId;
        }
        return sealDBModel.find(BRANCHES_TABLE, conditions);
    }

    static async findByMraApprovalStatus(status: MraApprovalStatus): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { mraApprovalStatus: status });
    }

    static async getBranchesByEmailDomain(domain: string): Promise<Branch[]> {
        const allBranches = await sealDBModel.findAll(BRANCHES_TABLE);
        return allBranches.filter((branch: Branch) =>
            branch.email && branch.email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)
        );
    }

    static async getUnsyncedBranches(): Promise<Branch[]> {
        return sealDBModel.getUnsyncedRecords(BRANCHES_TABLE);
    }

    static async markAsSynced(branchId: string): Promise<number> {
        return sealDBModel.markAsSynced(BRANCHES_TABLE, branchId);
    }

    static async clearAllBranches(): Promise<number> {
        return sealDBModel.clearTable(BRANCHES_TABLE);
    }

    static buildBranchData(data: CreateBranchRequest): Omit<Branch, 'createdAt' | 'updatedAt'> {
        return {
            branchId: uuidv4(),
            tenantId: data.tenantId,
            branchCode: data.branchCode,
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
            currencySymbol: data.currencySymbol || 'MK',
            isVirtualWarehouse: data.isVirtualWarehouse || false,
            isActive: true,
            status: 'active',
            mraApprovalStatus: 'PENDING',
            synced: false,
        };
    }

    static buildUpdateData(data: Partial<Branch>): Partial<Branch> {
        const {
            branchId,
            tenantId,
            createdAt,
            ...updateableData
        } = data;

        console.log('====================================');
        console.log(branchId,
            tenantId,
            createdAt,);
        console.log('====================================');

        return {
            ...updateableData,
            updatedAt: new Date()
        };
    }

    static validateBranchData(data: Partial<Branch>): string | null {
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

    private static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static async findByEmail(email: string): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { email });
    }

    static async findByPhone(phoneNumber: string): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { phoneNumber });
    }

    static async findBySiteId(siteId: string): Promise<Branch[]> {
        return sealDBModel.find(BRANCHES_TABLE, { siteId });
    }

    static async findBranchesWithPagination(
        conditions: any = {},
        page = 1,
        limit = 10
    ): Promise<{ branches: Branch[], total: number, page: number, limit: number }> {
        const allBranches = await sealDBModel.find(BRANCHES_TABLE, conditions);
        const total = allBranches.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const branches = allBranches.slice(startIndex, endIndex);

        return {
            branches,
            total,
            page,
            limit
        };
    }

    static async findBranchesWithSorting(
        conditions: any = {},
        sortBy: keyof Branch = 'branchName',
        sortOrder: 'asc' | 'desc' = 'asc'
    ): Promise<Branch[]> {
        const branches = await sealDBModel.find(BRANCHES_TABLE, conditions);

        return branches.sort((a: Branch, b: Branch) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];

            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return sortOrder === 'asc' ? 1 : -1;
            if (bValue === undefined) return sortOrder === 'asc' ? -1 : 1;

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
}