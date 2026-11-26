import { Tenant, TenantFormValues } from "tenant";
import { BranchModel } from "../models/branch.model";
import { TenantModel } from "../models/tenant.model";
import { TerminalModel } from "../models/terminal.model";
import { TenantCreateInput } from "../databases/prisma/generated/prisma/models";
import { ValidationError } from '../utils/errors';
import prisma from '../databases/prisma/client';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../utils/pagination.utils';
import { recordTenantChangeAsync } from './sync/change-log.service';

/**
 * @class   TenantService
 * @desc    Business logic layer for tenant management operations
 */
export class TenantService {
    /**
     * @method  getAllTenants
     * @desc    Retrieve all tenants with optional query filters
     * @param   query - Optional query parameters for filtering
     * @returns Promise<Omit<Tenant, 'verificationToken'>[]> - Array of sanitized tenants
     * @throws  Error - Failed to retrieve tenants
     */
    static async getAllTenants(query: any = {}): Promise<Omit<Tenant, 'verificationToken'>[]> {
        try {
            const tenants = await TenantModel.findAll(query);
            return tenants.map(tenant => TenantModel.sanitizeTenant(tenant));
        } catch (error) {
            throw new Error(`Failed to retrieve tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async listTenants(
        query: any = {},
        pagination: PaginationParams,
    ): Promise<PaginatedResult<Omit<Tenant, 'verificationToken'>>> {
        try {
            const where: any = {};
            if (query.status) where.status = query.status;
            if (query.businessType) where.businessType = query.businessType;
            if (query.country) where.country = query.country;
            if (query.search) {
                where.OR = [
                    { businessName: { contains: query.search } },
                    { ownerName: { contains: query.search } },
                    { email: { contains: query.search } },
                    { tenantCode: { contains: query.search } },
                ];
            }

            const [tenants, total] = await Promise.all([
                prisma.tenant.findMany({
                    where,
                    skip: pagination.skip,
                    take: pagination.limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.tenant.count({ where }),
            ]);

            return {
                data: tenants.map(t => TenantModel.sanitizeTenant(t as Tenant)),
                pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
            };
        } catch (error) {
            throw new Error(`Failed to retrieve tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @method  registerTenant
     * @desc    Register a new tenant with default branch, terminal, user, and subscription
     * @param   data - Tenant registration form values
     * @returns Promise<Tenant> - The created tenant
     * @throws  Error - Missing required field (businessName, tin, businessType, ownerName, phoneNumber, email)
     * @throws  Error - Invalid email format
     * @throws  Error - Invalid TIN format
     * @throws  Error - Tenant with this email already exists
     * @throws  Error - Tenant with this TIN already exists
     */
    static async registerTenant(data: TenantFormValues): Promise<Tenant> {
        const validationError = ValidationError.validateRequired(data, [
            'businessName',
            'tin',
            'businessType',
            'ownerName',
            'phoneNumber',
            'email',
        ]);

        if (validationError) {
            throw new ValidationError(validationError);
        }

        if (!this.validateEmail(data.email)) {
            throw new ValidationError('Invalid email format');
        }

        if (!this.validateTin(data.tin)) {
            throw new ValidationError('Invalid TIN format');
        }

        const existingTenantByEmail = await TenantModel.findByEmail(data.email);
        if (existingTenantByEmail.length > 0) {
            throw new ValidationError('Tenant with this email already exists');
        }

        const existingTenantByTin = await TenantModel.findByTin(data.tin);
        if (existingTenantByTin.length > 0) {
            throw new ValidationError('Tenant with this TIN already exists');
        }

        return await TenantModel.create(data as TenantCreateInput);
    }

    /**
     * @method  getTenantById
     * @desc    Retrieve a single tenant by ID
     * @param   tenantId - Unique tenant identifier
     * @returns Promise<Omit<Tenant, 'verificationToken'>> - Sanitized tenant data
     * @throws  Error - Tenant not found
     */
    static async getTenantById(tenantId: string): Promise<Omit<Tenant, 'verificationToken'>> {
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        return TenantModel.sanitizeTenant(tenant);
    }

    /**
     * @method  updateTenant
     * @desc    Update an existing tenant's data
     * @param   tenantId - Unique tenant identifier
     * @param   updateData - Partial tenant data to update
     * @returns Promise<Omit<Tenant, 'verificationToken'>> - Updated sanitized tenant data
     * @throws  Error - Tenant not found
     * @throws  Error - Email already exists
     * @throws  Error - TIN already exists
     * @throws  Error - Failed to update tenant
     */
    static async updateTenant(tenantId: string, updateData: Partial<TenantFormValues>): Promise<Omit<Tenant, 'verificationToken'>> {
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        if (updateData.email && updateData.email !== tenant.email) {
            const existingTenants = await TenantModel.findByEmail(updateData.email);
            if (existingTenants.length > 0) {
                throw new Error('Email already exists');
            }
        }

        if (updateData.tin && updateData.tin !== tenant.tin) {
            const existingTenants = await TenantModel.findByTin(updateData.tin);
            if (existingTenants.length > 0) {
                throw new Error('TIN already exists');
            }
        }

        const updatedTenant = await TenantModel.update(tenantId, updateData as Partial<any>);

        if (updateData.status && updateData.status !== tenant.status) {
            await recordTenantChangeAsync('tenants', tenantId, 'UPDATE', tenantId);
        }

        return TenantModel.sanitizeTenant(updatedTenant);
    }

    /**
     * @method  deleteTenant
     * @desc    Soft delete a tenant (only if no related data exists)
     * @param   tenantId - Unique tenant identifier
     * @returns Promise<{ status: boolean }> - Deletion status
     * @throws  Error - Tenant not found
     * @throws  Error - Cannot delete tenant with existing subscriptions, branches, or terminals
     * @throws  Error - Failed to delete tenant
     */
    static async deleteTenant(tenantId: string): Promise<{ status: boolean }> {
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const branches = await BranchModel.findByTenantId(tenantId);
        const terminals = await TerminalModel.findByTenantId(tenantId);

        if (branches.length > 0 || terminals.length > 0) {
            throw new Error('Cannot delete tenant with existing branches or terminals');
        }

        const isDeleted = await TenantModel.delete(tenantId);
        if (isDeleted) {
            throw new Error('Failed to delete tenant');
        }

        return { status: true };
    }

    /**
     * @method  validateEmail
     * @desc    Validate email format using regex
     * @param   email - Email string to validate
     * @returns boolean - True if valid email format
     * @private
     */
    private static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * @method  validateTin
     * @desc    Validate TIN (Tax Identification Number) format
     * @param   tin - TIN string to validate
     * @returns boolean - True if valid TIN
     * @private
     */
    private static validateTin(tin: string): boolean {
        return tin && tin.length > 0;
    }
}