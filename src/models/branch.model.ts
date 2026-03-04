import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import { Branch, BranchStatus, CreateBranchRequest } from 'branch';
import { BranchCreateInput, BranchUncheckedCreateInput } from 'src/databases/prisma/generated/prisma/models';
import { BranchMRAApprovalStatus } from '../databases/prisma/generated/prisma/enums';
import { Tenant } from 'tenant';
import { BranchSubscription } from 'subscription';

/**
 * @class   BranchModel
 * @desc    Data access layer for branch database operations
 */
export class BranchModel {
    /**
     * @method  findAll
     * @desc    Retrieve all branches with optional conditions
     * @param   conditions - Query conditions for filtering
     * @returns Promise<Branch[]> - Array of branches
     */
    static async findAll(conditions = {}): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: conditions
        });
    }

    /**
     * @method  findByTenantId
     * @desc    Find all branches belonging to a tenant
     * @param   tenantId - Unique tenant identifier
     * @param   params - Optional additional query parameters (e.g., { isActive: true })
     * @returns Promise<Branch[]> - Array of branches for the tenant
     */
    static async findByTenantId(tenantId: string, params: Record<string, unknown> = {}): Promise<Branch[]> {
        return await prisma.branch.findMany({
            where: { tenantId, ...params }
        });
    }

    /**
     * @method  findById
     * @desc    Find a single branch by ID
     * @param   branchId - Unique branch identifier
     * @returns Promise<Branch | null> - Branch data or null if not found
     */
    static async findById(branchId: string): Promise<Branch | null> {
        const branch = await prisma.branch.findUnique({
            where: { branchId }
        });

        return branch;
    }

    /**
     * @method  findByIdWithRelations
     * @desc    Find a single branch by ID with tenant and subscription details
     * @param   branchId - Unique branch identifier
     * @returns Promise<object | null> - Branch with relations or null if not found
     */
    static async findByIdWithRelations(branchId: string): Promise<{
        branch: Branch;
        tenant: Tenant;
        branchSubscription: BranchSubscription;
    } | null> {
        const branch = await prisma.branch.findUnique({
            where: { branchId },
            include: {
                tenant: true,
                branchSubscription: {
                    include: {
                        subscriptionPlan: true
                    }
                }
            }
        });

        if (!branch) {
            return null;
        }

        return {
            branch: branch as unknown as Branch,
            tenant: branch.tenant,
            branchSubscription: branch.branchSubscription || null
        };
    }

    /**
     * @method  create
     * @desc    Create a new branch record with auto-generated branchId and timestamps
     * @param   branchData - Branch creation data
     * @returns Promise<Branch> - Created branch
     */
    static async create(branchData: BranchCreateInput | BranchUncheckedCreateInput) {
        return await prisma.branch.create({
            data: {
                ...branchData,
                branchId: branchData.branchId || uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        }) as unknown as Branch;
    }

    /**
     * @method  update
     * @desc    Update an existing branch record
     * @param   branchId - Unique branch identifier
     * @param   data - Partial branch data to update
     * @returns Promise<Branch> - Updated branch
     */
    static async update(branchId: string, data: Partial<Branch>): Promise<Branch> {
        const updateData = this.buildUpdateData(data);

        return await prisma.branch.update({
            where: { branchId },
            data: updateData
        }) as unknown as Branch;
    }

    /**
     * @method  delete
     * @desc    Delete a branch record
     * @param   branchId - Unique branch identifier
     * @returns Promise<Branch> - Deleted branch
     */
    static async delete(branchId: string): Promise<Branch> {
        return await prisma.branch.delete({
            where: { branchId }
        }) as unknown as Branch;
    }

    /**
     * @method  buildBranchData
     * @desc    Build complete branch data object with defaults
     * @param   data - Input branch creation request
     * @returns Object - Complete branch data ready for insertion
     */
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
            districtId: data.districtId || null,
            location: data.location || null,
            businessType: data.businessType || 'PRODUCT_BASED',
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
            branchSubscriptionId: data.branchSubscriptionId || null,
            synced: data.synced || 0,
            createdAt: now,
            updatedAt: now,
            mraApprovalDate: null
        };
    }

    /**
     * @method  buildUpdateData
     * @desc    Build update data object with updatedAt timestamp
     * @param   data - Partial branch data to update
     * @returns Partial<Branch> - Update data with timestamp
     */
    static buildUpdateData(data: Partial<Branch>): Partial<Branch> {
        return {
            ...data,
            updatedAt: new Date()
        };
    }
}