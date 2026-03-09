import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../databases/prisma/client';
import { StockMovementService } from './stock-movement.service';
import {
    CreateSaleInput,
    SaleWithItems,
    VoidSaleInput,
    ListSalesOptions,
    SalesSummaryOptions,
    SalesSummary,
    ProcessedSaleItem,
} from '../types/sale.types';
import {
    SALE_NUMBER,
    PAGINATION,
    ERROR_MESSAGES,
    MOVEMENT_TYPES,
    roundCurrency,
} from '../constants/sale.constants';
import {
    generateSaleNumberPrefix,
    formatSaleNumber,
    extractSequenceNumber,
    createProcessedItem,
    createPaymentData,
    createSinglePaymentData,
    calculateTotalPaid,
    mapSaleToResponse,
    getProductDisplayName,
    validateStockAvailability,
    validatePaymentAmount,
    buildSaleInclude,
    buildDateFilter,
    buildSearchFilter,
} from '../utils/sale.utils';

/**
 * Sale Service - handles all sale-related business logic
 */
export class SaleService {
    /**
     * Create a new sale with support for multiple payment methods
     * 
     * Features:
     * - Validates product variants and stock availability
     * - Supports both single and multiple payment methods
     * - Includes retry logic for sale number generation race conditions
     * - Updates inventory and creates stock movements
     * 
     * @param data - Sale input data
     * @param tenantId - Tenant identifier
     * @param branchId - Branch identifier
     * @param retryAttempt - Current retry attempt (internal use)
     * @returns Created sale with items and payments
     * @throws Error if validation fails or insufficient stock/payment
     */
    static async createSale(
        data: CreateSaleInput,
        tenantId: string,
        branchId: string,
        retryAttempt = 0
    ): Promise<SaleWithItems> {
        try {
            return await prisma.$transaction(async (tx) => {
                // Step 1: Process and validate all items
                const { items: processedItems, subtotal } = await this.processItems(
                    data.items,
                    tenantId,
                    branchId,
                    tx
                );

                // Step 2: Calculate sale totals
                const totals = this.calculateSaleTotals(data, subtotal);

                // Step 3: Validate payment
                const totalPaid = this.getTotalPaid(data);
                validatePaymentAmount(totals.totalAmount, totalPaid);

                // Step 4: Generate unique sale number
                const saleNumber = await this.generateSaleNumber(tenantId, branchId, tx, retryAttempt);

                // Step 5: Prepare payment data
                const payments = this.preparePayments(data, totalPaid);

                // Step 6: Create the sale record
                const sale = await this.createSaleRecord(tx, {
                    tenantId,
                    branchId,
                    saleNumber,
                    data,
                    totals,
                    totalPaid,
                    processedItems,
                    payments,
                });

                // Step 7: Update inventory and record movements
                await this.updateInventoryForSale(tx, processedItems, sale.id, saleNumber, data.userId, tenantId, branchId);

                return mapSaleToResponse(sale);
            });
        } catch (error: any) {
            // Handle unique constraint errors with retry
            if (this.isUniqueConstraintError(error) && retryAttempt < SALE_NUMBER.MAX_RETRIES) {
                await this.delay(SALE_NUMBER.RETRY_DELAY_MS * (retryAttempt + 1));
                return this.createSale(data, tenantId, branchId, retryAttempt + 1);
            }
            throw error;
        }
    }

    /**
     * Get a single sale by ID
     * 
     * @param saleId - Sale identifier
     * @param tenantId - Tenant identifier
     * @param branchId - Branch identifier
     * @returns Sale with items or null if not found
     */
    static async getSaleById(
        saleId: string,
        tenantId: string,
        branchId: string
    ): Promise<SaleWithItems | null> {
        const sale = await prisma.sale.findFirst({
            where: { id: saleId, tenantId, branchId },
            include: buildSaleInclude(),
        });

        return sale ? mapSaleToResponse(sale) : null;
    }

    /**
     * List sales with pagination and filters
     * 
     * @param tenantId - Tenant identifier
     * @param branchId - Branch identifier
     * @param options - Filter and pagination options
     * @returns Paginated sales response
     */
    static async listSales(
        tenantId: string,
        branchId: string,
        options?: ListSalesOptions
    ): Promise<{ sales: SaleWithItems[]; total: number; totalPages: number }> {
        const page = options?.page || PAGINATION.DEFAULT_PAGE;
        const limit = Math.min(options?.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
        const skip = (page - 1) * limit;

        // Build where clause
        const where = this.buildListSalesWhere(tenantId, branchId, options);

        // Execute queries in parallel
        const [sales, total] = await Promise.all([
            prisma.sale.findMany({
                where,
                include: buildSaleInclude(),
                skip,
                take: limit,
                orderBy: { saleDate: 'desc' },
            }),
            prisma.sale.count({ where }),
        ]);

        return {
            sales: sales.map(mapSaleToResponse),
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Void a sale and restore inventory
     * 
     * @param saleId - Sale to void
     * @param tenantId - Tenant identifier
     * @param branchId - Branch identifier
     * @param data - Void reason and user info
     * @returns Updated voided sale
     * @throws Error if sale not found or already voided
     */
    static async voidSale(
        saleId: string,
        tenantId: string,
        branchId: string,
        data: VoidSaleInput
    ): Promise<SaleWithItems> {
        return await prisma.$transaction(async (tx) => {
            // Get sale with items and inventory info
            const sale = await tx.sale.findFirst({
                where: { id: saleId, tenantId, branchId },
                include: {
                    items: {
                        include: {
                            variant: {
                                include: {
                                    inventories: true,
                                    product: { select: { id: true, name: true } },
                                },
                            },
                        },
                    },
                },
            });

            if (!sale) {
                throw new Error(ERROR_MESSAGES.SALE_NOT_FOUND);
            }

            if (sale.isVoided) {
                throw new Error(ERROR_MESSAGES.SALE_ALREADY_VOIDED);
            }

            // Restore inventory for each item
            await this.restoreInventoryForVoid(tx, sale, data, tenantId, branchId);

            // Update sale status
            const voidedSale = await tx.sale.update({
                where: { id: saleId },
                data: {
                    isVoided: true,
                    voidedAt: new Date(),
                    voidedBy: data.voidedBy,
                    voidReason: data.voidReason,
                    status: 'VOIDED',
                },
                include: buildSaleInclude(),
            });

            return mapSaleToResponse(voidedSale);
        });
    }

    /**
     * Get sales summary statistics
     * 
     * @param tenantId - Tenant identifier
     * @param branchId - Branch identifier
     * @param filters - Summary filters
     * @returns Sales summary with totals and counts
     */
    static async getSalesSummary(
        tenantId: string,
        branchId: string,
        filters: SalesSummaryOptions
    ): Promise<SalesSummary> {
        const where = this.buildSummaryWhere(tenantId, branchId, filters);

        const sales = await prisma.sale.findMany({
            where,
            select: {
                totalAmount: true,
                status: true,
                isVoided: true,
            },
        });

        return this.calculateSummary(sales);
    }

    /**
     * Process and validate all sale items
     */
    private static async processItems(
        items: CreateSaleInput['items'],
        tenantId: string,
        branchId: string,
        tx: any
    ): Promise<{ items: ProcessedSaleItem[]; subtotal: number }> {
        let subtotal = 0;
        const processedItems: ProcessedSaleItem[] = [];

        for (const item of items) {
            const variantId = item.variantId || item.productId;
            if (!variantId) {
                throw new Error(ERROR_MESSAGES.MISSING_VARIANT_ID);
            }

            // Find variant with product and inventory
            const variant = await tx.productVariant.findFirst({
                where: {
                    id: variantId,
                    tenantId,
                    branchId,
                    isActive: true,
                    product: { isActive: true },
                },
                include: {
                    product: true,
                    inventories: true,
                },
            });

            if (!variant) {
                throw new Error(`${ERROR_MESSAGES.VARIANT_NOT_FOUND} (${variantId})`);
            }

            const inventory = variant.inventories?.[0];
            if (!inventory) {
                throw new Error(`${ERROR_MESSAGES.NO_INVENTORY} for ${variant.product.name} - ${variant.variantName}`);
            }

            // Validate stock availability
            const displayName = getProductDisplayName(variant.product.name, variant.variantName);
            validateStockAvailability(inventory, item.quantity, displayName);

            // Create processed item (include productId for legacy database column)
            const processedItem = createProcessedItem(item, inventory.id, Number(inventory.averageCost), variant.productId);
            processedItems.push(processedItem);
            subtotal += processedItem.subtotal;
        }

        return { items: processedItems, subtotal };
    }

    /**
     * Calculate sale totals from items and additional amounts
     */
    private static calculateSaleTotals(
        data: CreateSaleInput,
        subtotal: number
    ): { taxAmount: number; discountAmount: number; otherCharges: number; totalAmount: number } {
        const taxAmount = data.taxAmount || 0;
        const discountAmount = data.discountAmount || 0;

        // Handle otherCharges as array of objects or as a number
        let otherCharges = 0;
        if (Array.isArray(data.otherCharges)) {
            otherCharges = data.otherCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
        } else if (typeof data.otherCharges === 'number') {
            otherCharges = data.otherCharges;
        }

        const totalAmount = subtotal + taxAmount + otherCharges - discountAmount;

        return {
            taxAmount: roundCurrency(taxAmount),
            discountAmount: roundCurrency(discountAmount),
            otherCharges: roundCurrency(otherCharges),
            totalAmount: roundCurrency(totalAmount),
        };
    }

    /**
     * Get total paid amount from data
     */
    private static getTotalPaid(data: CreateSaleInput): number {
        if (data.payments && data.payments.length > 0) {
            return calculateTotalPaid(data.payments);
        }
        return data.amountPaid;
    }

    /**
     * Prepare payment records for insertion
     */
    private static preparePayments(data: CreateSaleInput, totalPaid: number): any[] {
        if (data.payments && data.payments.length > 0) {
            return createPaymentData(data.payments);
        }
        if (data.paymentMethodId) {
            return createSinglePaymentData(data.paymentMethodId, totalPaid);
        }
        return [];
    }

    /**
     * Create the sale record in the database
     */
    private static async createSaleRecord(
        tx: any,
        params: {
            tenantId: string;
            branchId: string;
            saleNumber: string;
            data: CreateSaleInput;
            totals: { taxAmount: number; discountAmount: number; otherCharges: number; totalAmount: number };
            totalPaid: number;
            processedItems: ProcessedSaleItem[];
            payments: any[];
        }
    ): Promise<any> {
        const { tenantId, branchId, saleNumber, data, totals, totalPaid, processedItems, payments } = params;
        const changeAmount = totalPaid - totals.totalAmount;

        return tx.sale.create({
            data: {
                id: uuidv4(),
                tenantId,
                branchId,
                saleNumber,
                customerId: data.customerId,
                terminalId: data.terminalId,
                userId: data.userId,
                subtotal: processedItems.reduce((sum, item) => sum + item.subtotal, 0),
                taxAmount: totals.taxAmount,
                discountAmount: totals.discountAmount,
                otherCharges: totals.otherCharges,
                totalAmount: totals.totalAmount,
                amountPaid: totalPaid,
                changeAmount,
                paymentMethodId: data.payments?.[0]?.paymentMethodId || data.paymentMethodId,
                status: 'COMPLETED',
                notes: data.notes,
                items: {
                    create: processedItems.map(({ inventoryId: _inventoryId, ...item }) => ({
                        id: uuidv4(),
                        ...item,
                    })),
                },
                ...(payments.length > 0 && {
                    payments: { create: payments },
                }),
            },
            include: buildSaleInclude(),
        });
    }

    /**
     * Update inventory quantities and record stock movements
     */
    private static async updateInventoryForSale(
        tx: any,
        items: ProcessedSaleItem[],
        saleId: string,
        saleNumber: string,
        userId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        for (const item of items) {
            await tx.inventory.update({
                where: { id: item.inventoryId },
                data: {
                    availableQuantity: { decrement: item.quantity },
                    lastSoldAt: new Date(),
                },
            });

            await StockMovementService.recordMovement(
                {
                    tenantId,
                    branchId,
                    inventoryId: item.inventoryId,
                    movementType: MOVEMENT_TYPES.SALE,
                    quantity: item.quantity,
                    referenceType: 'SALE',
                    referenceId: saleId,
                    unitCost: item.unitCost,
                    notes: `Sale ${saleNumber}`,
                    movedBy: userId,
                },
                tx
            );
        }
    }

    /**
     * Restore inventory when voiding a sale
     */
    private static async restoreInventoryForVoid(
        tx: any,
        sale: any,
        data: VoidSaleInput,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        for (const item of sale.items) {
            const inventory = item.variant?.inventory;
            if (!inventory) continue;

            await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    availableQuantity: { increment: item.quantity },
                },
            });

            await StockMovementService.recordMovement(
                {
                    tenantId,
                    branchId,
                    inventoryId: inventory.id,
                    movementType: MOVEMENT_TYPES.RETURN,
                    quantity: item.quantity,
                    referenceType: 'SALE',
                    referenceId: sale.id,
                    unitCost: Number(item.unitCost),
                    notes: `Void sale ${sale.saleNumber}: ${data.voidReason}`,
                    movedBy: data.voidedBy,
                },
                tx
            );
        }
    }

    /**
     * Generate unique sale number with retry support
     */
    private static async generateSaleNumber(
        tenantId: string,
        branchId: string,
        tx: any,
        retryCount = 0
    ): Promise<string> {
        const prefix = generateSaleNumberPrefix();

        // On retries, use main client to see committed transactions
        const queryClient = retryCount > 0 ? prisma : tx;

        const lastSale = await queryClient.sale.findFirst({
            where: {
                tenantId,
                branchId,
                saleNumber: { startsWith: prefix },
            },
            orderBy: { saleNumber: 'desc' },
        });

        let sequence = 1;
        if (lastSale) {
            sequence = extractSequenceNumber(lastSale.saleNumber) + 1;
        }

        // Add retry offset for safety
        sequence += retryCount;

        return formatSaleNumber(prefix, sequence);
    }

    /**
     * Build where clause for listing sales
     */
    private static buildListSalesWhere(
        tenantId: string,
        branchId: string,
        options?: ListSalesOptions
    ): any {
        const where: any = { tenantId, branchId };

        if (options?.status) where.status = options.status;
        if (options?.userId) where.userId = options.userId;
        if (options?.terminalId) where.terminalId = options.terminalId;
        if (options?.paymentMethodId) where.paymentMethodId = options.paymentMethodId;

        const dateFilter = buildDateFilter(options?.startDate, options?.endDate);
        if (dateFilter) where.saleDate = dateFilter;

        if (options?.search) {
            where.OR = buildSearchFilter(options.search);
        }

        return where;
    }

    /**
     * Build where clause for sales summary
     */
    private static buildSummaryWhere(
        tenantId: string,
        branchId: string,
        filters: SalesSummaryOptions
    ): any {
        const where: any = { tenantId, branchId };

        if (filters.status) where.status = filters.status;
        if (filters.paymentMethodId) where.paymentMethodId = filters.paymentMethodId;
        if (filters.userId) where.userId = filters.userId;
        if (filters.terminalId) where.terminalId = filters.terminalId;

        const dateFilter = buildDateFilter(filters.startDate, filters.endDate);
        if (dateFilter) where.saleDate = dateFilter;

        return where;
    }

    /**
     * Calculate summary statistics from sales data
     */
    private static calculateSummary(sales: any[]): SalesSummary {
        let totalSales = 0;
        let totalVoided = 0;
        let completedCount = 0;
        let voidedCount = 0;
        let refundedCount = 0;

        for (const sale of sales) {
            const amount = Number(sale.totalAmount) || 0;

            if (sale.status === 'VOIDED' || sale.isVoided) {
                totalVoided += amount;
                voidedCount++;
            } else if (sale.status === 'REFUNDED') {
                totalVoided += amount;
                refundedCount++;
            } else {
                totalSales += amount;
                completedCount++;
            }
        }

        return {
            totalSales: roundCurrency(totalSales),
            totalVoided: roundCurrency(totalVoided),
            netSales: roundCurrency(totalSales - totalVoided),
            totalCount: sales.length,
            completedCount,
            voidedCount,
            refundedCount,
        };
    }

    /**
     * Check if error is a unique constraint violation
     */
    private static isUniqueConstraintError(error: any): boolean {
        return (
            error.message?.includes('Unique constraint failed') ||
            error.message?.includes('sales_sale_number_key') ||
            error.code === 'P2002'
        );
    }

    /**
     * Async delay helper
     */
    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
