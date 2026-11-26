import { BranchModel } from "../models/branch.model";
import { TenantModel } from "../models/tenant.model";
import { BranchSubscriptionModel } from "../models/branch-subscription.model";
import { Branch, BranchPreferences, CreateBranchRequest } from "branch";
import { BranchCreateInput } from "../databases/prisma/generated/prisma/models";
import prisma from '../databases/prisma/client';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../utils/pagination.utils';
import { provisionDefaultPaymentMethods } from './payment-method-provisioning.service';

/**
 * @class   BranchService
 * @desc    Business logic layer for branch management operations
 */
export class BranchService {

	/**
	 * @method  getAllBranches
	 * @desc    Retrieve all branches with optional query filters
	 * @param   query - Optional query parameters (status, branchCode, city, state, district, branchName, isActive, isVirtualWarehouse, isAdminMode, tenantId)
	 * @param   tenantId - Tenant ID for scope filtering (bypassed if isAdminMode is true)
	 * @returns Promise<Branch[]> - Array of branches
	 * @throws  Error - Failed to retrieve branches
	 */
	static async getAllBranches(query: any = {}, tenantId: string): Promise<Branch[]> {
		try {
			const conditions: any = {};

			if (query.tenantId) {
				conditions.tenantId = query.tenantId;
			} else if (!query.isAdminMode) {
				conditions.tenantId = tenantId;
			}

			if (query.status) {
				conditions.status = query.status;
			}

			if (query.branchCode) {
				conditions.branchCode = query.branchCode;
			}

			if (query.city) {
				conditions.city = query.city;
			}

			if (query.state) {
				conditions.state = query.state;
			}

			if (query.district) {
				conditions.district = query.district;
			}

			if (query.branchName) {
				conditions.branchName = query.branchName;
			}

			if (query.isActive !== undefined) {
				conditions.isActive = query.isActive;
			}

			if (query.isVirtualWarehouse !== undefined) {
				conditions.isVirtualWarehouse = query.isVirtualWarehouse;
			}

			return await BranchModel.findAll(conditions);
		} catch (error: any) {
			throw new Error(`Failed to retrieve branches: ${error.message}`);
		}
	}

	static async listBranches(
		query: any = {},
		tenantId: string,
		pagination: PaginationParams,
	): Promise<PaginatedResult<Branch>> {
		try {
			const where: any = {};

			if (query.tenantId) {
				where.tenantId = query.tenantId;
			} else if (!query.isAdminMode) {
				where.tenantId = tenantId;
			}

			if (query.status) where.status = query.status;
			if (query.branchCode) where.branchCode = query.branchCode;
			if (query.city) where.city = query.city;
			if (query.state) where.state = query.state;
			if (query.district) where.district = query.district;
			if (query.branchName) where.branchName = query.branchName;
			if (query.isActive !== undefined) where.isActive = query.isActive;
			if (query.isVirtualWarehouse !== undefined) where.isVirtualWarehouse = query.isVirtualWarehouse;

			const [branches, total] = await Promise.all([
				prisma.branch.findMany({
					where,
					skip: pagination.skip,
					take: pagination.limit,
					orderBy: { createdAt: 'desc' },
				}),
				prisma.branch.count({ where }),
			]);

			return {
				data: branches as unknown as Branch[],
				pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
			};
		} catch (error: any) {
			throw new Error(`Failed to retrieve branches: ${error.message}`);
		}
	}

	/**
	 * @method  getBranchById
	 * @desc    Retrieve a single branch by ID
	 * @param   branchId - Unique branch identifier
	 * @returns Promise<Branch> - Branch data
	 * @throws  Error - Branch ID is required
	 * @throws  Error - Branch not found
	 */
	static async getBranchById(branchId: string): Promise<Branch> {
		if (!branchId) {
			throw new Error('Branch ID is required');
		}

		const branch = await BranchModel.findById(branchId);
		if (!branch) {
			throw new Error('Branch not found');
		}

		return branch;
	}

	/**
	 * @method  createBranch
	 * @desc    Create a new branch with auto-generated branch code and associated subscription
	 * @param   data - Branch creation data (tenantId, branchName, subscriptionPlanId required)
	 * @param   _userId - User ID performing the action (for audit)
	 * @returns Promise<Branch> - The created branch
	 * @throws  Error - Tenant not found
	 */
	static async createBranch(data: CreateBranchRequest, _userId: string): Promise<Branch> {
		const effectiveTenantId = data.tenantId;

		const tenant = await TenantModel.findById(effectiveTenantId);
		if (!tenant) {
			throw new Error('Tenant not found');
		}

		const existingBranches = await BranchModel.findByTenantId(effectiveTenantId);
		const branchNumber = existingBranches.length + 1;
		data.branchCode = `BR${String(branchNumber).padStart(3, '0')}`;

		const subscriptionData = BranchSubscriptionModel.buildSubscriptionData({
			subscriptionPlanId: data.subscriptionPlanId,
			subscriptionMonths: data.subscriptionMonths ?? 1,
			autoRenew: false
		});
		const branchSubscription = await BranchSubscriptionModel.create(subscriptionData);

		const branchData = BranchModel.buildBranchData({
			...data,
			tenantId: effectiveTenantId,
			branchSubscriptionId: branchSubscription.branchSubscriptionId
		});
		const branch = await BranchModel.create(branchData as unknown as BranchCreateInput);

		await provisionDefaultPaymentMethods(effectiveTenantId, branch.branchId);

		return branch;
	}

	/**
	 * @method  updateBranch
	 * @desc    Update an existing branch's data (branchId, tenantId, createdAt are protected)
	 * @param   branchId - Unique branch identifier
	 * @param   data - Partial branch data to update
	 * @returns Promise<Branch> - Updated branch data
	 * @throws  Error - Branch ID is required
	 * @throws  Error - Branch not found
	 * @throws  Error - Branch code already exists for this tenant
	 * @throws  Error - Failed to update branch
	 */
	static async updateBranch(branchId: string, data: Partial<Branch>): Promise<Branch> {
		if (!branchId) {
			throw new Error('Branch ID is required');
		}

		const existingBranch = await BranchModel.findById(branchId);
		if (!existingBranch) {
			throw new Error('Branch not found');
		}

		const protectedFields = ['branchId', 'tenantId', 'createdAt'];
		const updateData = { ...data };

		protectedFields.forEach(field => {
			if (field in updateData) {
				delete updateData[field as keyof typeof updateData];
			}
		});

		try {
			const updatedBranch = await BranchModel.update(branchId, updateData);
			return updatedBranch;
		} catch (error) {
			throw new Error(`Failed to update branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * @method  updatePreferences
	 * @desc    Shallow-merge new branch preference groups (e.g. navigation)
	 *          into the branch's existing branchPreferences JSON, scoped to
	 *          the caller's tenant so a branch can't be updated cross-tenant
	 * @param   branchId - Unique branch identifier
	 * @param   tenantId - Tenant ID of the authenticated caller
	 * @param   data - Preference groups to merge in (e.g. { navigation: { hiddenNavItemIds } })
	 * @returns Promise<Branch> - Updated branch data
	 * @throws  Error - Branch ID is required
	 * @throws  Error - Branch not found
	 */
	static async updatePreferences(
		branchId: string,
		tenantId: string,
		data: Partial<BranchPreferences>
	): Promise<Branch> {
		if (!branchId) {
			throw new Error('Branch ID is required');
		}

		const existingBranch = await BranchModel.findById(branchId);
		if (!existingBranch || existingBranch.tenantId !== tenantId) {
			throw new Error('Branch not found');
		}

		const mergedPreferences: BranchPreferences = {
			...(existingBranch.branchPreferences || {}),
			...data,
		};

		return await BranchModel.update(branchId, { branchPreferences: mergedPreferences });
	}

	/**
	 * @method  deleteBranch
	 * @desc    Delete a branch by ID
	 * @param   branchId - Unique branch identifier
	 * @returns Promise<{ status: boolean }> - Deletion status
	 * @throws  Error - Branch ID is required
	 * @throws  Error - Branch not found
	 * @throws  Error - Failed to delete branch
	 */
	static async deleteBranch(branchId: string): Promise<{ status: boolean }> {
		if (!branchId) {
			throw new Error('Branch ID is required');
		}

		const existingBranch = await BranchModel.findById(branchId);
		if (!existingBranch) {
			throw new Error('Branch not found');
		}

		const isDeleted = await BranchModel.delete(branchId);
		if (!isDeleted) {
			throw new Error('Failed to delete branch');
		}

		return { status: true };
	}
}