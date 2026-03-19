import Joi from 'joi';

const movementTypes = [
    'PURCHASE_RECEIPT',
    'SALE',
    'RETURN',
    'ADJUSTMENT',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'DAMAGE',
    'EXPIRY',
    'OPENING_BALANCE',
    'RETURN_TO_SUPPLIER',
];

const referenceTypes = [
    'PURCHASE_ORDER',
    'GOODS_RECEIPT',
    'SALE',
    'RETURN',
    'ADJUSTMENT',
    'TRANSFER',
    'OPENING_BALANCE',
    'SUPPLIER_RETURN',
];

export const stockMovementSchemas = {
    /**
     * Record a single stock movement via API
     */
    recordMovement: Joi.object({
        variantId: Joi.string().uuid().optional(),
        inventoryId: Joi.string().uuid().optional(),
        movementType: Joi.string().valid(...movementTypes).required(),
        quantity: Joi.number().integer().min(1).required(),
        referenceType: Joi.string().valid(...referenceTypes).allow(null).optional(),
        referenceId: Joi.string().uuid().allow(null).optional(),
        unitCost: Joi.number().min(0).optional(),
        notes: Joi.string().max(1000).allow(null, '').optional(),
    }).or('variantId', 'inventoryId') // At least one of these is required
        .messages({
            'object.missing': 'Either variantId or inventoryId is required',
        }),

    /**
     * Sync movements from offline terminal
     */
    syncMovements: Joi.object({
        movements: Joi.array().items(
            Joi.object({
                id: Joi.string().uuid().required(),
                tenantId: Joi.string().uuid().required(),
                branchId: Joi.string().uuid().required(),
                terminalId: Joi.string().uuid().required(),
                variantId: Joi.string().uuid().required(),
                productId: Joi.string().uuid().allow(null).optional(),
                movementType: Joi.string().valid(...movementTypes).required(),
                quantity: Joi.number().integer().min(0).required(),
                previousQuantity: Joi.number().integer().min(0).required(),
                newQuantity: Joi.number().integer().required(), // Can be negative if allowNegativeStock
                referenceType: Joi.string().valid(...referenceTypes).allow(null).optional(),
                referenceId: Joi.string().uuid().allow(null).optional(),
                unitCost: Joi.number().min(0).required(),
                totalCost: Joi.number().min(0).required(),
                notes: Joi.string().max(1000).allow(null, '').optional(),
                movedBy: Joi.string().uuid().required(),
                movementDate: Joi.date().iso().required(),
                createdAt: Joi.date().iso().required(),
            })
        ).min(1).required(),
    }),

    /**
     * Bulk record movements (internal use)
     */
    bulkRecordMovements: Joi.object({
        movements: Joi.array().items(
            Joi.object({
                variantId: Joi.string().uuid().optional(),
                inventoryId: Joi.string().uuid().optional(),
                movementType: Joi.string().valid(...movementTypes).required(),
                quantity: Joi.number().integer().min(1).required(),
                referenceType: Joi.string().valid(...referenceTypes).allow(null).optional(),
                referenceId: Joi.string().uuid().allow(null).optional(),
                unitCost: Joi.number().min(0).optional(),
                notes: Joi.string().max(1000).allow(null, '').optional(),
            }).or('variantId', 'inventoryId')
        ).min(1).required(),
    }),

    /**
     * Get movements query params
     */
    getMovementsQuery: Joi.object({
        movementType: Joi.string().valid(...movementTypes).optional(),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(500).optional(),
        perPage: Joi.number().integer().min(1).max(500).optional(),
    }),

    // ==========================================================================
    // Stock Adjustment Schemas
    // ==========================================================================

    /**
     * Record stock count (physical count vs system)
     */
    stockCount: Joi.object({
        inventoryId: Joi.string().uuid().required(),
        actualQuantity: Joi.number().integer().min(0).required(),
        unitCost: Joi.number().min(0).optional(),
        notes: Joi.string().max(1000).allow(null, '').optional(),
    }),

    /**
     * Record generic adjustment (+ or -)
     */
    adjustment: Joi.object({
        inventoryId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().not(0).required()
            .messages({ 'any.invalid': 'quantity must be a non-zero integer' }),
        unitCost: Joi.number().min(0).optional(),
        notes: Joi.string().max(1000).allow(null, '').optional(),
    }),

    /**
     * Record damaged stock
     */
    damage: Joi.object({
        inventoryId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).required(),
        unitCost: Joi.number().min(0).optional(),
        notes: Joi.string().max(1000).allow(null, '').optional(),
    }),

    /**
     * Record expired stock
     */
    expiry: Joi.object({
        inventoryId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).required(),
        unitCost: Joi.number().min(0).optional(),
        expiryDate: Joi.date().iso().optional(),
        notes: Joi.string().max(1000).allow(null, '').optional(),
    }),

    /**
     * Record stock transfer between branches
     */
    transfer: Joi.object({
        sourceInventoryId: Joi.string().uuid().required(),
        destinationBranchId: Joi.string().uuid().required(),
        destinationInventoryId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).required(),
        unitCost: Joi.number().min(0).optional(),
        transferId: Joi.string().uuid().required(),
        notes: Joi.string().max(1000).allow(null, '').optional(),
    }),

    /**
     * Record correction for an incorrect movement (immutable ledger)
     * Creates a compensating movement to reverse the original
     */
    correction: Joi.object({
        originalMovementId: Joi.string().uuid().required(),
        reason: Joi.string().min(5).max(1000).required()
            .messages({ 'string.min': 'reason must be at least 5 characters' }),
    }),

    // ==========================================================================
    // Opening Stock & Valuation Schemas
    // ==========================================================================

    /**
     * Record opening stock balance
     */
    openingStock: Joi.object({
        inventoryId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).required(),
        unitCost: Joi.number().min(0).required(),
        openingDate: Joi.date().iso().optional(),
        notes: Joi.string().max(1000).allow(null, '').optional(),
    }),

    /**
     * Change costing method for an inventory item
     */
    changeCostingMethod: Joi.object({
        inventoryId: Joi.string().uuid().required(),
        newMethod: Joi.string().valid('WEIGHTED_AVERAGE', 'FIFO', 'LIFO').required(),
    }),

    /**
     * Calculate COGS preview for a quantity
     */
    calculateCOGS: Joi.object({
        inventoryId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).required(),
        overrideMethod: Joi.string().valid('WEIGHTED_AVERAGE', 'FIFO', 'LIFO').optional(),
    }),

    /**
     * Rebuild cost layers from movement history
     */
    rebuildCostLayers: Joi.object({
        inventoryId: Joi.string().uuid().required(),
    }),
};
