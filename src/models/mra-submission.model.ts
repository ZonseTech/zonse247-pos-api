/**
 * MRA Submission Model
 * 
 * Manages MRA submission tracking for sales/transactions.
 * This model tracks the submission status and history of sales to MRA EIS.
 */

import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';

/**
 * MRA Submission Status enum (mirrors Prisma enum)
 */
export type MraSubmissionStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

/**
 * MRA Submission interface
 */
export interface MraSubmission {
    id: string;
    tenantId: string;
    branchId: string;
    terminalId: string | null;
    saleId: string;
    status: MraSubmissionStatus;
    attemptCount: number;
    lastAttemptAt: Date | null;
    nextAttemptAt: Date | null;
    requestPayload: unknown;
    responsePayload: unknown;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * MraSubmission Model class
 */
export class MraSubmissionModel {
    /**
     * Find submission by ID
     */
    static async findById(id: string): Promise<MraSubmission | null> {
        try {
            const submission = await prisma.mraSubmission.findUnique({
                where: { id },
            });
            return submission as MraSubmission | null;
        } catch (error) {
            console.error('Error finding MRA submission:', error);
            return null;
        }
    }

    /**
     * Find submission by sale ID
     */
    static async findBySaleId(saleId: string): Promise<MraSubmission | null> {
        try {
            const submission = await prisma.mraSubmission.findUnique({
                where: { saleId },
            });
            return submission as MraSubmission | null;
        } catch (error) {
            console.error('Error finding MRA submission by sale ID:', error);
            return null;
        }
    }

    /**
     * Find many submissions with filters
     */
    static async findMany(params: {
        where?: Record<string, unknown>;
        orderBy?: Record<string, 'asc' | 'desc'>;
        take?: number;
        skip?: number;
    }): Promise<MraSubmission[]> {
        try {
            const submissions = await prisma.mraSubmission.findMany({
                where: params.where as any,
                orderBy: params.orderBy as any,
                take: params.take,
                skip: params.skip,
            });
            return submissions as MraSubmission[];
        } catch (error) {
            console.error('Error finding MRA submissions:', error);
            return [];
        }
    }

    /**
     * Create new MRA submission
     */
    static async create(data: {
        data: Partial<MraSubmission> & { tenantId: string; branchId: string; saleId: string };
    }): Promise<MraSubmission> {
        try {
            const submission = await prisma.mraSubmission.create({
                data: {
                    id: data.data.id || uuidv4(),
                    tenantId: data.data.tenantId,
                    branchId: data.data.branchId,
                    terminalId: data.data.terminalId || null,
                    saleId: data.data.saleId,
                    status: (data.data.status || 'PENDING') as any,
                    attemptCount: data.data.attemptCount || 0,
                    lastAttemptAt: data.data.lastAttemptAt || null,
                    nextAttemptAt: data.data.nextAttemptAt || null,
                    requestPayload: data.data.requestPayload || null,
                    responsePayload: data.data.responsePayload || null,
                    errorMessage: data.data.errorMessage || null,
                },
            });
            return submission as MraSubmission;
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new Error('MRA submission for this sale already exists');
            }
            throw new Error(`Error creating MRA submission: ${error.message}`);
        }
    }

    /**
     * Update MRA submission
     */
    static async update(params: {
        where: { id: string };
        data: Partial<MraSubmission>;
    }): Promise<MraSubmission> {
        try {
            const submission = await prisma.mraSubmission.update({
                where: params.where,
                data: params.data as any,
            });
            return submission as MraSubmission;
        } catch (error: any) {
            throw new Error(`Error updating MRA submission: ${error.message}`);
        }
    }

    /**
     * Count submissions with filters
     */
    static async count(params: { where?: Record<string, unknown> }): Promise<number> {
        try {
            return await prisma.mraSubmission.count({
                where: params.where as any,
            });
        } catch (error) {
            console.error('Error counting MRA submissions:', error);
            return 0;
        }
    }

    /**
     * Delete many submissions with filters
     */
    static async deleteMany(params: { where?: Record<string, unknown> }): Promise<{ count: number }> {
        try {
            return await prisma.mraSubmission.deleteMany({
                where: params.where as any,
            });
        } catch (error) {
            console.error('Error deleting MRA submissions:', error);
            return { count: 0 };
        }
    }

    /**
     * Get pending submissions for a terminal
     */
    static async getPendingForTerminal(terminalId: string): Promise<MraSubmission[]> {
        return this.findMany({
            where: {
                terminalId,
                status: 'PENDING',
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Get failed submissions ready for retry
     */
    static async getFailedForRetry(terminalId: string, maxAttempts = 3): Promise<MraSubmission[]> {
        return this.findMany({
            where: {
                terminalId,
                status: 'FAILED',
                attemptCount: { lt: maxAttempts },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Mark submission as processing
     */
    static async markAsProcessing(id: string): Promise<MraSubmission> {
        return this.update({
            where: { id },
            data: {
                status: 'PROCESSING',
                lastAttemptAt: new Date(),
            },
        });
    }

    /**
     * Mark submission as success
     */
    static async markAsSuccess(
        id: string,
        responsePayload: unknown
    ): Promise<MraSubmission> {
        return this.update({
            where: { id },
            data: {
                status: 'SUCCESS',
                responsePayload,
                errorMessage: null,
            },
        });
    }

    /**
     * Mark submission as failed
     */
    static async markAsFailed(
        id: string,
        errorMessage: string,
        scheduleRetry = true
    ): Promise<MraSubmission> {
        const submission = await this.findById(id);
        const newAttemptCount = (submission?.attemptCount || 0) + 1;

        // Schedule next retry with exponential backoff
        const nextAttemptAt = scheduleRetry
            ? new Date(Date.now() + Math.min(Math.pow(2, newAttemptCount) * 60000, 3600000))
            : null;

        return this.update({
            where: { id },
            data: {
                status: 'FAILED',
                attemptCount: newAttemptCount,
                errorMessage,
                nextAttemptAt,
            },
        });
    }
}
