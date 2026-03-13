import Joi from 'joi';

export const inventoryValidationSchemas = {
    // Product schemas
    createProduct: Joi.object({
        tenantId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        sku: Joi.string().min(1).max(100).required(),
        name: Joi.string().min(1).max(255).required(),
        primaryBarcode: Joi.string().max(100).optional(),
        description: Joi.string().max(1000).optional(),
        unit: Joi.string().max(50).optional(),
        sellingPrice: Joi.number().min(0).required(),
        barcodes: Joi.array().items(
            Joi.object({
                barcode: Joi.string().required(),
                barcodeType: Joi.string().valid('EAN13', 'UPC', 'CODE128', 'QR', 'OTHER').optional(),
                barcodeSource: Joi.string().valid('MANUFACTURER', 'SUPPLIER', 'STORE', 'BUNDLE', 'PACKAGING', 'CUSTOM').optional(),
                description: Joi.string().max(255).optional(),
            })
        ).optional(),
    }),

    updateProduct: Joi.object({
        tenantId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        name: Joi.string().min(1).max(255).optional(),
        primaryBarcode: Joi.string().max(100).optional(),
        description: Joi.string().max(1000).optional(),
        unit: Joi.string().max(50).optional(),
        sellingPrice: Joi.number().min(0).optional(),
        isActive: Joi.boolean().optional(),
    }),

    // Supplier schemas
    createSupplier: Joi.object({
        tenantId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        name: Joi.string().min(1).max(255).required(),
        code: Joi.string().max(50).optional(),
        contactPerson: Joi.string().max(255).optional(),
        phone: Joi.string().max(50).optional(),
        email: Joi.string().email().optional(),
        address: Joi.string().max(500).optional(),
    }),

    updateSupplier: Joi.object({
        tenantId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        name: Joi.string().min(1).max(255).optional(),
        code: Joi.string().max(50).optional(),
        contactPerson: Joi.string().max(255).optional(),
        phone: Joi.string().max(50).optional(),
        email: Joi.string().email().optional(),
        address: Joi.string().max(500).optional(),
        isActive: Joi.boolean().optional(),
    }),

    // Purchase Order schemas
    createPurchaseOrder: Joi.object({
        tenantId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        supplierId: Joi.string().uuid().required(),
        expectedDeliveryDate: Joi.date().optional(),
        notes: Joi.string().max(1000).optional(),
        createdBy: Joi.string().uuid().required(),
        items: Joi.array().items(
            Joi.object({
                variantId: Joi.string().uuid().required(),
                orderedQuantity: Joi.number().integer().min(1).required(),
                unitPrice: Joi.number().min(0).required(),
            })
        ).min(1).required(),
    }),

    receivePurchaseOrder: Joi.object({
        tenantId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        receivedBy: Joi.string().uuid().required(),
        items: Joi.array().items(
            Joi.object({
                variantId: Joi.string().uuid().required(),
                receivedQuantity: Joi.number().integer().min(0).required(),
                damagedQuantity: Joi.number().integer().min(0).required(),
            })
        ).min(1).required(),
    }),

    // Sale schemas
    createSale: Joi.object({
        tenantId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        customerId: Joi.string().uuid().optional(),
        terminalId: Joi.string().uuid().optional(),
        userId: Joi.string().uuid().required(),
        taxAmount: Joi.number().min(0).optional(),
        discountAmount: Joi.number().min(0).optional(),
        amountPaid: Joi.number().min(0).required(),
        paymentMethodId: Joi.string().uuid().optional(),
        notes: Joi.string().max(1000).optional(),
        items: Joi.array().items(
            Joi.object({
                productId: Joi.string().uuid().required(),
                quantity: Joi.number().integer().min(1).required(),
                unitPrice: Joi.number().min(0).required(),
                taxAmount: Joi.number().min(0).optional(),
                discountAmount: Joi.number().min(0).optional(),
            })
        ).min(1).required(),
    }),

    voidSale: Joi.object({
        tenantId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        voidedBy: Joi.string().uuid().required(),
        voidReason: Joi.string().min(1).max(500).required(),
    }),
};
