import { getPrisma } from '../databases/prisma/client';

/**
 * Sync Incoming Service
 * Handles receiving data from local/offline POS terminals
 * This runs on the REMOTE/CLOUD server and receives data pushed from local instances
 */

export interface IncomingSyncResult {
    success: boolean;
    accepted: string[];
    rejected: { id: string; reason: string }[];
    timestamp: string;
}

export interface IncomingSingleResult {
    success: boolean;
    id?: string;
    message: string;
    error?: string;
}

// Field mapping from API (snake_case) to Prisma (camelCase)
const transformApiToLocal = (record: Record<string, any>): Record<string, any> => {
    const transformed: Record<string, any> = {};

    Object.entries(record).forEach(([key, value]) => {
        // Convert snake_case to camelCase
        const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

        // Handle date fields
        if (camelCaseKey.endsWith('At') || camelCaseKey.endsWith('Date') || camelCaseKey === 'createdAt' || camelCaseKey === 'updatedAt') {
            transformed[camelCaseKey] = value ? new Date(value) : null;
        } else {
            transformed[camelCaseKey] = value;
        }
    });

    // Ensure sync fields are set correctly for incoming data
    transformed.synced = true;
    transformed.syncedAt = new Date();

    return transformed;
};

// Validate required fields for each table
const REQUIRED_FIELDS: Record<string, string[]> = {
    sale: ['id', 'tenantId', 'branchId', 'saleNumber', 'userId'],
    saleItem: ['id', 'saleId', 'productId', 'quantity'],
    transaction: ['id', 'tenantId', 'branchId'],
    customer: ['id', 'tenantId', 'branchId', 'name'],
    inventory: ['id', 'tenantId', 'branchId', 'productId'],
    stockMovement: ['id', 'tenantId', 'branchId', 'productId'],
    auditLog: ['logId', 'actionType', 'entityType'],
};

export class SyncIncomingService {

    /**
     * Process batch of incoming sales records
     */
    async processSales(records: Record<string, any>[]): Promise<IncomingSyncResult> {
        return this.processIncomingBatch('sale', records);
    }

    /**
     * Process single incoming sale record
     */
    async processSingleSale(record: Record<string, any>): Promise<IncomingSingleResult> {
        return this.processSingleRecord('sale', record);
    }

    /**
     * Process batch of incoming sale items
     */
    async processSaleItems(records: Record<string, any>[]): Promise<IncomingSyncResult> {
        return this.processIncomingBatch('saleItem', records);
    }

    /**
     * Process single incoming sale item
     */
    async processSingleSaleItem(record: Record<string, any>): Promise<IncomingSingleResult> {
        return this.processSingleRecord('saleItem', record);
    }

    /**
     * Process batch of incoming transactions
     */
    async processTransactions(records: Record<string, any>[]): Promise<IncomingSyncResult> {
        return this.processIncomingBatch('transaction', records);
    }

    /**
     * Process single incoming transaction
     */
    async processSingleTransaction(record: Record<string, any>): Promise<IncomingSingleResult> {
        return this.processSingleRecord('transaction', record);
    }

    /**
     * Process batch of incoming customers
     */
    async processCustomers(records: Record<string, any>[]): Promise<IncomingSyncResult> {
        return this.processIncomingBatch('customer', records);
    }

    /**
     * Process single incoming customer
     */
    async processSingleCustomer(record: Record<string, any>): Promise<IncomingSingleResult> {
        return this.processSingleRecord('customer', record);
    }

    /**
     * Process batch of incoming inventory records
     */
    async processInventory(records: Record<string, any>[]): Promise<IncomingSyncResult> {
        return this.processIncomingBatch('inventory', records);
    }

    /**
     * Process single incoming inventory record
     */
    async processSingleInventory(record: Record<string, any>): Promise<IncomingSingleResult> {
        return this.processSingleRecord('inventory', record);
    }

    /**
     * Process batch of incoming stock movements
     */
    async processStockMovements(records: Record<string, any>[]): Promise<IncomingSyncResult> {
        return this.processIncomingBatch('stockMovement', records);
    }

    /**
     * Process single incoming stock movement
     */
    async processSingleStockMovement(record: Record<string, any>): Promise<IncomingSingleResult> {
        return this.processSingleRecord('stockMovement', record);
    }

    /**
     * Process batch of incoming audit logs
     */
    async processAuditLogs(records: Record<string, any>[]): Promise<IncomingSyncResult> {
        return this.processIncomingBatch('auditLog', records);
    }

    /**
     * Process single incoming audit log
     */
    async processSingleAuditLog(record: Record<string, any>): Promise<IncomingSingleResult> {
        return this.processSingleRecord('auditLog', record);
    }

    /**
     * Generic batch processor for any table
     */
    private async processIncomingBatch(
        tableName: string,
        records: Record<string, any>[]
    ): Promise<IncomingSyncResult> {
        const result: IncomingSyncResult = {
            success: false,
            accepted: [],
            rejected: [],
            timestamp: new Date().toISOString(),
        };

        if (!records || records.length === 0) {
            result.success = true;
            return result;
        }

        const client = await getPrisma();

        // Use transaction for atomicity
        try {
            await client.$transaction(async (tx: any) => {
                for (const record of records) {
                    const processResult = await this.upsertRecord(tx, tableName, record);

                    if (processResult.success && processResult.id) {
                        result.accepted.push(processResult.id);
                    } else {
                        result.rejected.push({
                            id: record.id || record.uuid || 'unknown',
                            reason: processResult.error || 'Unknown error',
                        });
                    }
                }
            }, {
                maxWait: 10000,
                timeout: 60000,
            });

            result.success = result.rejected.length === 0;

        } catch (error: any) {
            console.error(`[SyncIncoming] Transaction failed for ${tableName}:`, error.message);

            // If transaction fails, try processing individually
            for (const record of records) {
                const processResult = await this.upsertRecord(client, tableName, record);

                if (processResult.success && processResult.id) {
                    result.accepted.push(processResult.id);
                } else {
                    result.rejected.push({
                        id: record.id || record.uuid || 'unknown',
                        reason: processResult.error || 'Unknown error',
                    });
                }
            }

            result.success = result.rejected.length === 0;
        }

        console.log(`[SyncIncoming] ${tableName}: ${result.accepted.length} accepted, ${result.rejected.length} rejected`);
        return result;
    }

    /**
     * Process a single incoming record
     */
    private async processSingleRecord(
        tableName: string,
        record: Record<string, any>
    ): Promise<IncomingSingleResult> {
        const client = await getPrisma();
        return this.upsertRecord(client, tableName, record);
    }

    /**
     * Upsert a record - create if not exists, update if exists
     */
    private async upsertRecord(
        client: any,
        tableName: string,
        record: Record<string, any>
    ): Promise<IncomingSingleResult> {
        try {
            // Transform API format to local format
            const transformed = transformApiToLocal(record);

            // Validate required fields
            const validation = this.validateRecord(tableName, transformed);
            if (!validation.valid) {
                return {
                    success: false,
                    message: 'Validation failed',
                    error: validation.error,
                };
            }

            const recordId = transformed.id || transformed.uuid || transformed.logId;

            // Get the primary key field for this table
            const primaryKey = this.getPrimaryKeyField(tableName);

            // Check if record exists
            const existing = await client[tableName]?.findFirst({
                where: { [primaryKey]: recordId }
            });

            if (existing) {
                // Update existing record
                // Only update if incoming data is newer
                const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt) : new Date(0);
                const incomingUpdated = transformed.updatedAt ? new Date(transformed.updatedAt) : new Date();

                if (incomingUpdated >= existingUpdated) {
                    await client[tableName].update({
                        where: { [primaryKey]: recordId },
                        data: {
                            ...transformed,
                            updatedAt: new Date(),
                        }
                    });

                    return {
                        success: true,
                        id: recordId,
                        message: 'Record updated',
                    };
                } else {
                    // Skip - local version is newer
                    return {
                        success: true,
                        id: recordId,
                        message: 'Record skipped - server version is newer',
                    };
                }

            } else {
                // Create new record
                await client[tableName].create({
                    data: {
                        ...transformed,
                        createdAt: transformed.createdAt || new Date(),
                        updatedAt: new Date(),
                    }
                });

                return {
                    success: true,
                    id: recordId,
                    message: 'Record created',
                };
            }

        } catch (error: any) {
            console.error(`[SyncIncoming] Failed to upsert ${tableName} record:`, error.message);
            return {
                success: false,
                message: 'Database error',
                error: error.message,
            };
        }
    }

    /**
     * Get primary key field for a table
     */
    private getPrimaryKeyField(tableName: string): string {
        const primaryKeys: Record<string, string> = {
            sale: 'id',
            saleItem: 'id',
            transaction: 'id',
            customer: 'customerId',
            inventory: 'id',
            stockMovement: 'id',
            auditLog: 'logId',
        };

        return primaryKeys[tableName] || 'id';
    }

    /**
     * Validate a record has required fields
     */
    private validateRecord(
        tableName: string,
        record: Record<string, any>
    ): { valid: boolean; error?: string } {
        const requiredFields = REQUIRED_FIELDS[tableName] || ['id'];

        for (const field of requiredFields) {
            if (!record[field] && record[field] !== 0 && record[field] !== false) {
                return {
                    valid: false,
                    error: `Missing required field: ${field}`,
                };
            }
        }

        return { valid: true };
    }

    /**
     * Get sync statistics for the remote server
     */
    async getSyncStats(): Promise<{
        totalSynced: Record<string, number>;
        lastSyncAt: Record<string, Date | null>;
    }> {
        const client = await getPrisma();
        const stats: {
            totalSynced: Record<string, number>;
            lastSyncAt: Record<string, Date | null>;
        } = {
            totalSynced: {},
            lastSyncAt: {},
        };

        const tables = ['sale', 'saleItem', 'transaction', 'customer', 'inventory', 'stockMovement', 'auditLog'];

        for (const tableName of tables) {
            try {
                // Get count of synced records
                const count = await client[tableName]?.count({
                    where: { synced: true }
                }) || 0;
                stats.totalSynced[tableName] = count;

                // Get last sync timestamp
                const lastRecord = await client[tableName]?.findFirst({
                    where: { synced: true },
                    orderBy: { syncedAt: 'desc' },
                    select: { syncedAt: true }
                });
                stats.lastSyncAt[tableName] = lastRecord?.syncedAt || null;

            } catch {
                stats.totalSynced[tableName] = 0;
                stats.lastSyncAt[tableName] = null;
            }
        }

        return stats;
    }
}

const syncIncomingService = new SyncIncomingService();
export default syncIncomingService;
