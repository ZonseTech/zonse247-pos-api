import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Tenant, TenantFormValues } from 'tenant';
import prisma from '../databases/prisma/client';

export class TenantModel {
    static generateTenantCode(): string {
        return 'TNT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    }

    static async generateVerificationToken(tenantId: string): Promise<string> {
        tenantId
        return crypto.randomBytes(32).toString('hex');
    }

    static async findAll(query: any = {}): Promise<Array<Tenant>> {
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
        });
    }

    static async findByEmail(email: string): Promise<Array<Tenant>> {
        return await prisma.tenant.findMany({
            where: { email }
        });
    }

    static async findByTin(tin: string): Promise<Array<Tenant>> {
        return await prisma.tenant.findMany({
            where: { tin }
        });
    }

    static async findById(tenantId: string): Promise<Tenant | null> {
        return await prisma.tenant.findUnique({
            where: { tenantId }
        });
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
        });
    }

    static async findByCredentials(verificationToken: string): Promise<Tenant | null> {
        return await prisma.tenant.findFirst({
            where: { verificationToken }
        });
    }

    static async insert(data: TenantFormValues): Promise<Tenant> {
        return await this.create(data);
    }

    static async create(data: TenantFormValues): Promise<Tenant> {
        const tenantData = await this.buildTenantData(data) as unknown as Tenant;

        return await prisma.tenant.create({
            data: {
                tenantId: uuidv4(),
                ...tenantData
            }
        });
    }

    static async update(tenantId: string, updateData: Partial<Tenant>): Promise<Tenant> {
        return await prisma.tenant.update({
            where: { tenantId },
            data: updateData
        });
    }

    static async delete(tenantId: string): Promise<Tenant> {
        return await prisma.tenant.delete({
            where: { tenantId }
        });
    }

    static async buildTenantData(data: TenantFormValues): Promise<Omit<Tenant, 'createdAt' | 'updatedAt' | 'id'>> {
        const tenantId = uuidv4()
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        const verificationToken = await this.generateVerificationToken(tenantId)

        return {
            tenantId,
            tenantCode: this.generateTenantCode(),
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
            verificationToken,
            authKey: data.authKey,
            status: data.status || 'pending',
            registeredAt: new Date(),
            activatedAt: null,
            synced: 0
        };
    }

    static sanitizeTenant(tenant: Tenant): Omit<Tenant, 'verificationToken'> {
        const { verificationToken: _, ...safeTenant } = tenant;
        return safeTenant;
    }
}