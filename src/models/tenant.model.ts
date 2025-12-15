import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { Tenant, TenantFormValues, TenantStatus, SubscriptionStatus, MsonkhoOnlineStatus, TenantQueryParams } from 'tenant';
import prisma from '../databases/prisma/client';
import { TenantCreateInput } from '../databases/prisma/generated/prisma/models';

export class TenantModel {
    static generateTenantCode(): string {
        return 'TNT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    }

    static async generateVerificationToken(tenantId: string): Promise<string> {
        tenantId
        return crypto.randomBytes(32).toString('hex');
    }

    static async findAll(query: TenantQueryParams = {}): Promise<Tenant[]> {
        const where: any = {};

        if (query.status) {
            where.status = query.status;
        }

        if (query.subscriptionStatus) {
            where.subscriptionStatus = query.subscriptionStatus;
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
                { businessName: { contains: query.search, mode: 'insensitive' } },
                { tradingName: { contains: query.search, mode: 'insensitive' } },
                { ownerName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { tenantCode: { contains: query.search, mode: 'insensitive' } }
            ];
        }

        return await prisma.tenant.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        }) as unknown as Tenant[];
    }

    static async findByEmail(email: string): Promise<Tenant[]> {
        return await prisma.tenant.findMany({
            where: { email }
        }) as unknown as Tenant[];
    }

    static async findByTin(tin: string): Promise<Tenant[]> {
        return await prisma.tenant.findMany({
            where: { tin }
        }) as unknown as Tenant[];
    }

    static async findById(tenantId: string): Promise<Tenant | null> {
        return await prisma.tenant.findUnique({
            where: { tenantId }
        }) as unknown as Tenant | null;
    }

    static async exists(tenantId: string): Promise<boolean> {
        try {
            const result = await prisma.tenant.findUnique({
                where: { tenantId },
                select: { tenantId: true }
            });
            return result !== null;
        } catch (error) {
            console.error('Error checking if tenant exists:', error);
            return false;
        }
    }

    static async findByTenantCode(tenantCode: string): Promise<Tenant | null> {
        return await prisma.tenant.findUnique({
            where: { tenantCode }
        }) as unknown as Tenant | null;
    }

    static async findByCredentials(verificationToken: string): Promise<Tenant | null> {
        return await prisma.tenant.findFirst({
            where: { verificationToken }
        }) as unknown as Tenant | null;
    }

    static async findByVerificationToken(verificationToken: string): Promise<Tenant | null> {
        return await this.findByCredentials(verificationToken);
    }

    static async insert(data: TenantCreateInput): Promise<Tenant> {
        return await this.create(data);
    }

    static async create(data: TenantCreateInput): Promise<Tenant> {
        const tenantData = await this.buildTenantData(data);

        return await prisma.tenant.create({
            data: tenantData
        }) as unknown as Tenant;
    }

    static async update(tenantId: string, updateData: Partial<Tenant>): Promise<Tenant> {
        const dataToUpdate: any = {
            ...updateData,
            updatedAt: new Date()
        };

        // Remove fields that shouldn't be updated directly
        delete dataToUpdate.tenantId;
        delete dataToUpdate.createdAt;

        return await prisma.tenant.update({
            where: { tenantId },
            data: dataToUpdate
        }) as unknown as Tenant;
    }

    static async delete(tenantId: string): Promise<Tenant> {
        return await prisma.tenant.delete({
            where: { tenantId }
        }) as unknown as Tenant;
    }

    static async updateStatus(tenantId: string, status: TenantStatus): Promise<Tenant> {
        const updateData: Partial<Tenant> = { status };

        if (status === 'active') {
            updateData.activatedAt = new Date();
        }

        return await this.update(tenantId, updateData);
    }

    static async updateSubscriptionStatus(
        tenantId: string,
        subscriptionStatus: SubscriptionStatus
    ): Promise<Tenant> {
        return await this.update(tenantId, { subscriptionStatus });
    }

    static async updateMsonkhoStatus(
        tenantId: string,
        msonkhoOnlineStatus: MsonkhoOnlineStatus
    ): Promise<Tenant> {
        return await this.update(tenantId, { msonkhoOnlineStatus });
    }

    static async extendTrial(tenantId: string, days: number): Promise<Tenant> {
        const tenant = await this.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const currentTrialEnd = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : new Date();
        const newTrialEnd = new Date(currentTrialEnd);
        newTrialEnd.setDate(newTrialEnd.getDate() + days);

        return await this.update(tenantId, { trialEndsAt: newTrialEnd });
    }

    static async markAsSynced(tenantId: string): Promise<Tenant> {
        return await this.update(tenantId, { synced: 1 });
    }

    static async markAsUnsynced(tenantId: string): Promise<Tenant> {
        return await this.update(tenantId, { synced: 0 });
    }

    static async findUnsynced(): Promise<Tenant[]> {
        return await prisma.tenant.findMany({
            where: { synced: 0 }
        }) as unknown as Tenant[];
    }

    static async count(query: TenantQueryParams = {}): Promise<number> {
        const where: any = {};

        if (query.status) {
            where.status = query.status;
        }

        if (query.subscriptionStatus) {
            where.subscriptionStatus = query.subscriptionStatus;
        }

        if (query.businessType) {
            where.businessType = query.businessType;
        }

        if (query.msonkhoOnlineStatus) {
            where.msonkhoOnlineStatus = query.msonkhoOnlineStatus;
        }

        return await prisma.tenant.count({ where });
    }

    static async buildTenantData(data: TenantCreateInput): Promise<TenantCreateInput> {
        const now = new Date();
        const trialEndDate = new Date();
        const tenantId = data.tenantId || uuidv4();
        trialEndDate.setDate(trialEndDate.getDate() + 30);
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
            subscriptionPlan: data.subscriptionPlan || null,
            subscriptionStatus: data.subscriptionStatus || 'TRIAL',
            address: data.address || null,
            country: data.country || null,
            trialEndsAt: trialEndDate,
            verificationToken: data.verificationToken || verificationToken,
            status: data.status || 'pending',
            registeredAt: now,
            createdAt: now,
            updatedAt: now,
            activatedAt: null,
            synced: 0
        };
    }

    static sanitizeTenant(tenant: Tenant): Omit<Tenant, 'verificationToken'> {
        const { ...safeTenant } = tenant;

        delete safeTenant.verificationToken

        return safeTenant as any;
    }

    static validateCreateRequest(data: TenantFormValues): string[] {
        const errors: string[] = [];

        if (!data.businessName || data.businessName.trim().length === 0) {
            errors.push('Business name is required');
        }

        if (data.businessName && data.businessName.trim().length > 200) {
            errors.push('Business name must be less than 200 characters');
        }

        if (!data.tin || data.tin.trim().length === 0) {
            errors.push('TIN is required');
        }

        if (!data.businessType) {
            errors.push('Business type is required');
        }

        if (data.businessType && !['PRODUCT_BASED', 'SERVICE_BASED'].includes(data.businessType)) {
            errors.push('Business type must be either PRODUCT_BASED or SERVICE_BASED');
        }

        if (!data.ownerName || data.ownerName.trim().length === 0) {
            errors.push('Owner name is required');
        }

        if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
            errors.push('Phone number is required');
        }

        if (!data.email || data.email.trim().length === 0) {
            errors.push('Email is required');
        }

        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('Email must be a valid email address');
        }

        return errors;
    }

    static validateUpdateRequest(data: Partial<Tenant>): string[] {
        const errors: string[] = [];

        if (data.businessName !== undefined) {
            if (!data.businessName || data.businessName.trim().length === 0) {
                errors.push('Business name cannot be empty');
            }

            if (data.businessName && data.businessName.trim().length > 200) {
                errors.push('Business name must be less than 200 characters');
            }
        }

        if (data.email !== undefined) {
            if (!data.email || data.email.trim().length === 0) {
                errors.push('Email cannot be empty');
            }

            if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
                errors.push('Email must be a valid email address');
            }
        }

        if (data.businessType !== undefined &&
            !['PRODUCT_BASED', 'SERVICE_BASED'].includes(data.businessType)) {
            errors.push('Business type must be either PRODUCT_BASED or SERVICE_BASED');
        }

        if (data.status !== undefined &&
            !['pending', 'active', 'suspended', 'cancelled'].includes(data.status)) {
            errors.push('Status must be one of: pending, active, suspended, cancelled');
        }

        if (data.subscriptionStatus !== undefined &&
            !['ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL'].includes(data.subscriptionStatus)) {
            errors.push('Subscription status must be one of: ACTIVE, SUSPENDED, CANCELLED, TRIAL');
        }

        if (data.msonkhoOnlineStatus !== undefined &&
            !['VERIFIED', 'PENDING', 'FAILED'].includes(data.msonkhoOnlineStatus)) {
            errors.push('Msonkho online status must be one of: VERIFIED, PENDING, FAILED');
        }

        if (data.synced !== undefined && ![0, 1].includes(data.synced)) {
            errors.push('Synced status must be 0 or 1');
        }

        return errors;
    }
}