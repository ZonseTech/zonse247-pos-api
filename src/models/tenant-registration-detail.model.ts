import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';

export interface TenantRegistrationDetailInput {
    tenantId: string;
    businessName: string;
    ownerName: string;
    email: string;
    tenantCode: string;
    verificationToken: string;
    username: string;
    password: string;
}

export interface TenantRegistrationDetail extends TenantRegistrationDetailInput {
    id: number;
    detailId: string;
    isProcessed: boolean;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export class TenantRegistrationDetailModel {
    /**
     * Find all registration details
     */
    static async findAll(): Promise<TenantRegistrationDetail[]> {
        const results = await prisma.tenantRegistrationDetail.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return results as unknown as TenantRegistrationDetail[];
    }

    /**
     * Create a new tenant registration detail record
     */
    static async create(data: TenantRegistrationDetailInput): Promise<TenantRegistrationDetail> {
        const detailId = uuidv4();

        const result = await prisma.tenantRegistrationDetail.create({
            data: {
                detailId,
                tenantId: data.tenantId,
                businessName: data.businessName,
                ownerName: data.ownerName,
                email: data.email,
                tenantCode: data.tenantCode,
                verificationToken: data.verificationToken,
                username: data.username,
                password: data.password,
                isProcessed: false,
            },
        });

        return result as unknown as TenantRegistrationDetail;
    }

    /**
     * Find all unprocessed registration details
     */
    static async findUnprocessed(): Promise<TenantRegistrationDetail[]> {
        const results = await prisma.tenantRegistrationDetail.findMany({
            where: { isProcessed: false },
            orderBy: { createdAt: 'desc' },
        });

        return results as unknown as TenantRegistrationDetail[];
    }

    /**
     * Find registration detail by ID
     */
    static async findById(detailId: string): Promise<TenantRegistrationDetail | null> {
        const result = await prisma.tenantRegistrationDetail.findUnique({
            where: { detailId },
        });

        return result as unknown as TenantRegistrationDetail | null;
    }

    /**
     * Find registration details by tenant ID
     */
    static async findByTenantId(tenantId: string): Promise<TenantRegistrationDetail[]> {
        const results = await prisma.tenantRegistrationDetail.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });

        return results as unknown as TenantRegistrationDetail[];
    }

    /**
     * Find registration detail by email
     */
    static async findByEmail(email: string): Promise<TenantRegistrationDetail[]> {
        const results = await prisma.tenantRegistrationDetail.findMany({
            where: { email },
            orderBy: { createdAt: 'desc' },
        });

        return results as unknown as TenantRegistrationDetail[];
    }

    /**
     * Mark a registration detail as processed
     */
    static async markAsProcessed(detailId: string): Promise<TenantRegistrationDetail | null> {
        const result = await prisma.tenantRegistrationDetail.update({
            where: { detailId },
            data: {
                isProcessed: true,
                processedAt: new Date(),
            },
        });

        return result as unknown as TenantRegistrationDetail | null;
    }

    /**
     * Delete a registration detail
     */
    static async delete(detailId: string): Promise<boolean> {
        try {
            await prisma.tenantRegistrationDetail.delete({
                where: { detailId },
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Delete all processed registration details older than specified days
     */
    static async cleanupOld(daysOld = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await prisma.tenantRegistrationDetail.deleteMany({
            where: {
                isProcessed: true,
                processedAt: {
                    lt: cutoffDate,
                },
            },
        });

        return result.count;
    }
}
