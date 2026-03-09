import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import type { Tenant, TenantQueryParams } from 'tenant';
import { TenantCreateInput } from '../databases/prisma/generated/prisma/models';

/**
 * @class   TenantModel
 * @desc    Data access layer for tenant database operations
 */
export class TenantModel {
    /**
     * @method  generateTenantCode
     * @desc    Generate a unique tenant code (TNT-{timestamp}-{random})
     * @returns string - Generated tenant code
     * @private
     */
    private static generateTenantCode(): string {
        return 'TNT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    }

    /**
     * @method  generateVerificationToken
     * @desc    Generate a secure verification token for tenant activation
     * @param   tenantId - Tenant ID (for future use)
     * @returns Promise<string> - 64-character hex token
     * @private
     */
    private static async generateVerificationToken(tenantId: string): Promise<string> {
        tenantId
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * @method  findAll
     * @desc    Retrieve all tenants with optional query filters
     * @param   query - Query parameters (status, businessType, country, msonkhoOnlineStatus, search)
     * @returns Promise<Tenant[]> - Array of tenants
     */
    static async findAll(query: TenantQueryParams = {}): Promise<Tenant[]> {
        const where: any = {};

        if (query.status) {
            where.status = query.status;
        }

        if (query.businessType) {
            where.businessType = query.businessType;
        }

        if (query.country) {
            where.country = query.country;
        }

        if (query.msonkhoOnlineStatus) {
            where.msonkhoOnlineStatus = query.msonkhoOnlineStatus;
        }

        if (query.search) {
            where.OR = [
                { businessName: { contains: query.search } },
                { tradingName: { contains: query.search } },
                { ownerName: { contains: query.search } },
                { email: { contains: query.search } },
                { tenantCode: { contains: query.search } }
            ];
        }

        return await prisma.tenant.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        }) as unknown as Tenant[];
    }

    /**
     * @method  findByEmail
     * @desc    Find tenants by email address
     * @param   email - Email address to search
     * @returns Promise<Tenant[]> - Array of matching tenants
     */
    static async findByEmail(email: string): Promise<Tenant[]> {
        return await prisma.tenant.findMany({
            where: { email }
        }) as unknown as Tenant[];
    }

    /**
     * @method  findByTin
     * @desc    Find tenants by TIN (Tax Identification Number)
     * @param   tin - TIN to search
     * @returns Promise<Tenant[]> - Array of matching tenants
     */
    static async findByTin(tin: string): Promise<Tenant[]> {
        return await prisma.tenant.findMany({
            where: { tin }
        }) as unknown as Tenant[];
    }

    /**
     * @method  findById
     * @desc    Find a single tenant by ID
     * @param   tenantId - Unique tenant identifier
     * @returns Promise<Tenant | null> - Tenant data or null if not found
     */
    static async findById(tenantId: string): Promise<Tenant | null> {
        return await prisma.tenant.findUnique({
            where: { tenantId }
        }) as unknown as Tenant | null;
    }

    /**
     * @method  create
     * @desc    Create a new tenant record
     * @param   data - Tenant creation data
     * @returns Promise<Tenant> - Created tenant
     */
    static async create(data: TenantCreateInput): Promise<Tenant> {
        const tenantData = await this.buildTenantData(data);

        return await prisma.tenant.create({
            data: tenantData
        }) as unknown as Tenant;
    }

    /**
     * @method  update
     * @desc    Update an existing tenant record (tenantId, createdAt are protected)
     * @param   tenantId - Unique tenant identifier
     * @param   updateData - Partial tenant data to update
     * @returns Promise<Tenant> - Updated tenant
     */
    static async update(tenantId: string, updateData: Partial<Tenant>): Promise<Tenant> {
        const dataToUpdate: any = {
            ...updateData,
            updatedAt: new Date()
        };

        delete dataToUpdate.tenantId;
        delete dataToUpdate.createdAt;

        return await prisma.tenant.update({
            where: { tenantId },
            data: dataToUpdate
        }) as unknown as Tenant;
    }

    /**
     * @method  delete
     * @desc    Delete a tenant record
     * @param   tenantId - Unique tenant identifier
     * @returns Promise<Tenant> - Deleted tenant
     */
    static async delete(tenantId: string): Promise<Tenant> {
        return await prisma.tenant.delete({
            where: { tenantId }
        }) as unknown as Tenant;
    }

    /**
     * @method  buildTenantData
     * @desc    Build complete tenant data object with defaults and generated values
     * @param   data - Input tenant data
     * @returns Promise<TenantCreateInput> - Complete tenant data ready for insertion
     */
    static async buildTenantData(data: TenantCreateInput): Promise<TenantCreateInput> {
        const now = new Date();
        const tenantId = data.tenantId || uuidv4();
        const verificationToken = await this.generateVerificationToken(tenantId);

        return {
            tenantId,
            tenantCode: data.tenantCode || this.generateTenantCode(),
            businessName: data.businessName,
            tradingName: data.tradingName || null,
            tin: data.tin,
            businessType: data.businessType,
            ownerName: data.ownerName,
            phoneNumber: data.phoneNumber,
            email: data.email,
            mraPortalUsername: data.mraPortalUsername || null,
            isVatRegistered: data.isVatRegistered || false,
            taxOfficeCode: data.taxOfficeCode || null,
            msonkhoOnlineStatus: data.msonkhoOnlineStatus || 'PENDING',
            address: data.address || null,
            country: data.country || null,
            verificationToken: data.verificationToken || verificationToken,
            status: data.status || 'pending',
            registeredAt: now,
            createdAt: now,
            updatedAt: now,
            activatedAt: null,
            synced: 0
        };
    }

    /**
     * @method  sanitizeTenant
     * @desc    Remove sensitive fields (verificationToken) from tenant object
     * @param   tenant - Tenant data to sanitize
     * @returns Omit<Tenant, 'verificationToken'> - Sanitized tenant without sensitive data
     */
    static sanitizeTenant(tenant: Tenant): Omit<Tenant, 'verificationToken'> {
        const { ...safeTenant } = tenant;

        delete safeTenant.verificationToken

        return safeTenant as any;
    }
}