import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from '../databases/local';
import { TENANT_TABLE } from '../databases/local/tables';

export class TenantModel {
    static generateTenantCode(): string {
        return 'TNT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    }

    static async generateVerificationToken(tenantId: string): Promise<string> {
        return crypto.randomBytes(32).toString('hex');
    }

    static async findAll(query: any = {}): Promise<Array<Tenant>> {
        const conditions: any = {};

        if (query.status) {
            conditions.status = query.status;
        }

        if (query.subscriptionStatus) {
            conditions.subscriptionStatus = query.subscriptionStatus;
        }

        if (query.businessType) {
            conditions.businessType = query.businessType;
        }

        if (query.country) {
            conditions.country = query.country;
        }

        if (query.msonkhoOnlineStatus) {
            conditions.msonkhoOnlineStatus = query.msonkhoOnlineStatus;
        }

        if (query.search) {
            conditions.$or = [
                { businessName: { $regex: new RegExp(query.search, 'i') } },
                { tradingName: { $regex: new RegExp(query.search, 'i') } },
                { ownerName: { $regex: new RegExp(query.search, 'i') } },
                { email: { $regex: new RegExp(query.search, 'i') } },
                { tenantCode: { $regex: new RegExp(query.search, 'i') } }
            ];
        }

        return sealDBModel.find(TENANT_TABLE, conditions);
    }

    static async findByEmail(email: string): Promise<Array<Tenant>> {
        return sealDBModel.find(TENANT_TABLE, { email });
    }

    static async findByTin(tin: string): Promise<Array<Tenant>> {
        return sealDBModel.find(TENANT_TABLE, { tin });
    }

    static async findById(tenantId: string): Promise<Tenant | null> {
        return sealDBModel.findById(TENANT_TABLE, { tenantId });
    }

    static async findByTenantCode(tenantCode: string): Promise<Tenant | null> {
        const results = await sealDBModel.find(TENANT_TABLE, { tenantCode });
        return results.length > 0 ? results[0] : null;
    }

    static async findByCredentials(verificationToken: string): Promise<Tenant | null> {
        return await sealDBModel.findOne(TENANT_TABLE, { verificationToken });
    }

    static async create(data: TenantFormValues): Promise<Tenant> {
        const tenantData = await this.buildTenantData(data);

        return await sealDBModel.insert(TENANT_TABLE, {
            uuid: uuidv4(),
            ...tenantData
        });
    }

    static async update(tenantId: string, updateData: Partial<Tenant>): Promise<number> {
        return sealDBModel.update(TENANT_TABLE, { tenantId }, updateData);
    }

    static async delete(tenantId: string): Promise<number> {
        return sealDBModel.delete(TENANT_TABLE, { tenantId });
    }

    static async buildTenantData(data: TenantFormValues): Promise<Omit<Tenant, 'createdAt' | 'updatedAt'>> {
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
            status: data.status || 'pending',
            registeredAt: new Date(),
            activatedAt: null,
            synced: false
        };
    }

    static sanitizeTenant(tenant: Tenant): Omit<Tenant, 'verificationToken'> {
        const { verificationToken, ...safeTenant } = tenant;
        return safeTenant;
    }
}