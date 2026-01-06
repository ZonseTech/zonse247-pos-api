/* eslint-disable @typescript-eslint/no-unused-vars */
import { TenantService } from "./tenant.service";
import { BranchModel } from "../models/branch.model";
import { TenantModel } from "../models/tenant.model";
import { SubscriptionModel } from "../models/subscription.model";
import { Branch, BranchStatus, CreateBranchRequest } from "branch";
import { BaseService } from "./base.service";
import { BranchCreateInput } from "../databases/prisma/generated/prisma/models";

export class BranchService {

	static async getAllBranches(query: any = {}, tenantId: string): Promise<Branch[]> {
		try {
			const conditions: any = {};

			// Always filter by tenant
			conditions.tenantId = tenantId;

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

	static async getBranchesByTenantId(tenantId: string): Promise<Branch[]> {
		if (!tenantId) {
			throw new Error('Tenant ID is required');
		}

		const response = await BaseService.get<Array<Branch>>(`/on-boarding/live/tenant/${tenantId}/branches`);

		if (!response.success) {
			throw new Error(response.message || 'Failed to fetch branches. External application down');
		}

		const branches = response.data;

		if (branches && branches.length > 0) {
			for (const branch of branches) {
				const branchExists = await BranchModel.exists(branch.branchId, tenantId);
				if (!branchExists) {
					await BranchModel.insert(branch);
				}
			}
		}

		return branches;
	}

	static async getAccountBranchesByTenantId(tenantId: string): Promise<Branch[]> {
		if (!tenantId) {
			throw new Error('Tenant ID is required');
		}

		return await BranchModel.findByTenantId(tenantId);
	}

	static async getBranchById(branchId: string, tenantId?: string): Promise<Branch> {
		if (!branchId) {
			throw new Error('Branch ID is required');
		}

		const branch = await BranchModel.findById(branchId);
		if (!branch) {
			throw new Error('Branch not found');
		}

		return branch;
	}

	static async createBranch(data: CreateBranchRequest, tenantId: string, _userId: string): Promise<Branch> {
		const validationError = TenantService.validateRequired(data, ['branchName']);
		if (validationError) {
			throw new Error(validationError);
		}

		// Use tenantId from auth context
		const effectiveTenantId = tenantId;

		const tenant = await TenantModel.findById(effectiveTenantId);
		if (!tenant) {
			throw new Error('Tenant not found');
		}

		// Auto-generate branch code if not provided
		if (!data.branchCode) {
			const existingBranches = await BranchModel.findByTenantId(effectiveTenantId);
			const branchNumber = existingBranches.length + 1;
			data.branchCode = `BR${String(branchNumber).padStart(3, '0')}`;
		}

		// Check if branch code already exists
		const existingBranches = await BranchModel.findByTenantIdAndBranchCode(effectiveTenantId, data.branchCode);
		if (existingBranches.length > 0) {
			throw new Error('Branch code already exists for this tenant');
		}

		// Check subscription limits
		const subscription = await SubscriptionModel.findActiveByTenantId(effectiveTenantId);
		if (subscription) {
			const plan = await SubscriptionModel.findById(subscription.subscriptionPlanId);

			if (plan) {
				const existingBranchesCount = await BranchModel.findByTenantId(effectiveTenantId);
				if (existingBranchesCount.length >= plan.maxBranches) {
					throw new Error(`Maximum number of branches (${plan.maxBranches}) reached for current subscription plan`);
				}
			}
		}

		const branchData = BranchModel.buildBranchData({ ...data, tenantId: effectiveTenantId });
		return BranchModel.create(branchData as unknown as BranchCreateInput);
	}

	static async updateBranch(branchId: string, data: Partial<Branch>, tenantId: string): Promise<Branch> {
		if (!branchId) {
			throw new Error('Branch ID is required');
		}

		const existingBranch = await BranchModel.findById(branchId);
		if (!existingBranch) {
			throw new Error('Branch not found');
		}

		const protectedFields = ['branchId', 'tenantId', 'createdAt', 'id'];
		const updateData = { ...data };

		protectedFields.forEach(field => {
			if (field in updateData) {
				delete updateData[field as keyof typeof updateData];
			}
		});

		if (updateData.branchCode && updateData.branchCode !== existingBranch.branchCode) {
			const existingBranches = await BranchModel.findByTenantIdAndBranchCode(existingBranch.tenantId, updateData.branchCode);
			if (existingBranches.length > 0) {
				throw new Error('Branch code already exists for this tenant');
			}
		}

		try {
			const updatedBranch = await BranchModel.update(branchId, updateData);
			return updatedBranch;
		} catch (error) {
			throw new Error(`Failed to update branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	static async deleteBranch(branchId: string, tenantId: string): Promise<{ status: boolean }> {
		if (!branchId) {
			throw new Error('Branch ID is required');
		}

		const existingBranch = await BranchModel.findById(branchId);
		if (!existingBranch) {
			throw new Error('Branch not found');
		}

		const isDeleted = await BranchModel.delete(branchId);
		if (isDeleted) {
			throw new Error('Failed to delete branch');
		}

		return { status: true };
	}

	static async getBranchesByTenant(tenantId: string): Promise<Branch[]> {
		if (!tenantId) {
			throw new Error('Tenant ID is required');
		}

		return await BranchModel.findByTenantId(tenantId);
	}

	static async getBranchByCode(tenantId: string, branchCode: string): Promise<Branch | null> {
		if (!tenantId || !branchCode) {
			throw new Error('Tenant ID and Branch Code are required');
		}

		const branches = await BranchModel.findByTenantIdAndBranchCode(tenantId, branchCode);
		return branches.length > 0 ? branches[0] : null;
	}

	static async updateBranchStatus(branchId: string, status: BranchStatus, tenantId?: string): Promise<Branch> {
		if (!branchId || !status) {
			throw new Error('Branch ID and status are required');
		}

		const validStatuses: BranchStatus[] = ['active', 'inactive', 'suspended'];
		if (!validStatuses.includes(status)) {
			throw new Error('Invalid status. Must be one of: active, inactive, suspended');
		}

		// Get branch first to retrieve tenantId if not provided
		if (!tenantId) {
			const branch = await BranchModel.findById(branchId);
			if (!branch) {
				throw new Error('Branch not found');
			}
			tenantId = branch.tenantId;
		}

		return await this.updateBranch(branchId, { status }, tenantId);
	}

	static async toggleBranchActive(branchId: string, isActive: boolean, tenantId?: string): Promise<Branch> {
		if (!branchId) {
			throw new Error('Branch ID is required');
		}

		// Get branch first to retrieve tenantId if not provided
		if (!tenantId) {
			const branch = await BranchModel.findById(branchId);
			if (!branch) {
				throw new Error('Branch not found');
			}
			tenantId = branch.tenantId;
		}

		return await this.updateBranch(branchId, { isActive }, tenantId);
	}

	static async createDefault(params: {
		tenantId: string;
		branchId: string;
	} | null): Promise<Branch> {
		const now = new Date();

		const lastId = await BranchModel.getLastId();
		const branchCode = `BR${lastId + 1}`;

		const data = {
			branchName: 'Default Branch',
			branchCode,
			addressLine1: '123 Main Street',
			city: 'Lilongwe',
			district: 'Lilongwe Urban',
			phoneNumber: '+265999000111',
			email: 'branch@example.com',
			currencySymbol: 'K',
			currencyCode: 'MKW',
			taxRate: 0.0,
			chargeTax: false,
			status: 'active',
			isActive: true,
			isVirtualWarehouse: false,
			synced: 0,
			mraApprovalStatus: 'PENDING',
			createdAt: now,
			updatedAt: now,
		};

		const branchData = BranchModel.buildBranchData({ ...data, ...params });
		return BranchModel.create(branchData as unknown as BranchCreateInput);
	}
}