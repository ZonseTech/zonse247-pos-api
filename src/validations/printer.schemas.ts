import Joi from 'joi';
import {
    PrinterType,
    PrinterConnectionType,
    PrinterStatus,
    PrintJobType
} from '../types/printer';

/**
 * Printer Validation Schemas
 * Comprehensive validation for all printer-related operations
 */
export const printerValidationSchemas = {
    /**
     * Create printer validation
     */
    createPrinter: Joi.object({
        printerName: Joi.string()
            .min(2)
            .max(100)
            .required()
            .messages({
                'string.min': 'Printer name must be at least 2 characters',
                'string.max': 'Printer name must not exceed 100 characters',
                'any.required': 'Printer name is required'
            }),

        printerModel: Joi.string()
            .max(100)
            .optional()
            .allow(null, '')
            .messages({
                'string.max': 'Printer model must not exceed 100 characters'
            }),

        printerType: Joi.string()
            .valid(...Object.values(PrinterType))
            .required()
            .messages({
                'any.only': `Printer type must be one of: ${Object.values(PrinterType).join(', ')}`,
                'any.required': 'Printer type is required'
            }),

        connectionType: Joi.string()
            .valid(...Object.values(PrinterConnectionType))
            .required()
            .messages({
                'any.only': `Connection type must be one of: ${Object.values(PrinterConnectionType).join(', ')}`,
                'any.required': 'Connection type is required'
            }),

        connectionAddress: Joi.string()
            .max(255)
            .optional()
            .allow(null, '')
            .when('connectionType', {
                is: Joi.valid('NETWORK', 'WIFI'),
                then: Joi.string().ip().optional(),
                otherwise: Joi.string().optional()
            })
            .messages({
                'string.ip': 'Invalid IP address format',
                'string.max': 'Connection address must not exceed 255 characters'
            }),

        port: Joi.number()
            .port()
            .optional()
            .allow(null)
            .default(9100)
            .messages({
                'number.port': 'Port must be a valid port number (0-65535)'
            }),

        baudRate: Joi.number()
            .valid(9600, 19200, 38400, 57600, 115200)
            .optional()
            .allow(null)
            .default(9600)
            .messages({
                'any.only': 'Baud rate must be one of: 9600, 19200, 38400, 57600, 115200'
            }),

        vendorId: Joi.string()
            .pattern(/^[0-9a-fA-F]{4}$/)
            .optional()
            .allow(null, '')
            .messages({
                'string.pattern.base': 'Vendor ID must be a 4-digit hexadecimal value'
            }),

        productId: Joi.string()
            .pattern(/^[0-9a-fA-F]{4}$/)
            .optional()
            .allow(null, '')
            .messages({
                'string.pattern.base': 'Product ID must be a 4-digit hexadecimal value'
            }),

        serialNumber: Joi.string()
            .max(100)
            .optional()
            .allow(null, '')
            .messages({
                'string.max': 'Serial number must not exceed 100 characters'
            }),

        terminalId: Joi.string()
            .uuid()
            .optional()
            .allow(null, '')
            .messages({
                'string.guid': 'Terminal ID must be a valid UUID'
            }),

        isDefault: Joi.boolean()
            .optional()
            .default(false),

        isReceiptPrinter: Joi.boolean()
            .optional()
            .default(true),

        isLabelPrinter: Joi.boolean()
            .optional()
            .default(false),

        isKitchenPrinter: Joi.boolean()
            .optional()
            .default(false),

        isReportPrinter: Joi.boolean()
            .optional()
            .default(false),

        configuration: Joi.object({
            paperWidth: Joi.number()
                .valid(58, 80, 112)
                .optional()
                .default(80),
            paperHeight: Joi.number()
                .min(10)
                .max(1000)
                .optional(),
            dpi: Joi.number()
                .valid(180, 203, 300, 600)
                .optional()
                .default(203),
            fontSize: Joi.number()
                .min(8)
                .max(24)
                .optional()
                .default(12),
            encoding: Joi.string()
                .valid('UTF-8', 'CP437', 'CP850', 'CP858', 'CP866', 'CP1252')
                .optional()
                .default('UTF-8'),
            cutPaper: Joi.boolean()
                .optional()
                .default(true),
            openCashDrawer: Joi.boolean()
                .optional()
                .default(false),
            printLogo: Joi.boolean()
                .optional()
                .default(true),
            logoUrl: Joi.string()
                .uri()
                .optional()
                .allow(null, ''),
            headerLines: Joi.array()
                .items(Joi.string().max(100))
                .max(10)
                .optional(),
            footerLines: Joi.array()
                .items(Joi.string().max(100))
                .max(10)
                .optional(),
            printSpeed: Joi.number()
                .min(1)
                .max(10)
                .optional(),
            darkness: Joi.number()
                .min(1)
                .max(10)
                .optional()
                .default(5),
            marginTop: Joi.number()
                .min(0)
                .max(50)
                .optional()
                .default(5),
            marginBottom: Joi.number()
                .min(0)
                .max(50)
                .optional()
                .default(5),
            marginLeft: Joi.number()
                .min(0)
                .max(50)
                .optional()
                .default(5),
            marginRight: Joi.number()
                .min(0)
                .max(50)
                .optional()
                .default(5),
            beepAfterPrint: Joi.boolean()
                .optional()
                .default(false),
            copies: Joi.number()
                .min(1)
                .max(99)
                .optional()
                .default(1),
            lineSpacing: Joi.number()
                .valid(1, 1.5, 2, 2.5)
                .optional()
                .default(1.5),
            printMode: Joi.string()
                .valid('normal', 'draft', 'high')
                .optional()
                .default('normal'),
            autoPrintOnSale: Joi.boolean()
                .optional()
                .default(true)
        }).optional()
    }),

    /**
     * Update printer validation
     */
    updatePrinter: Joi.object({
        printerName: Joi.string()
            .min(2)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Printer name must be at least 2 characters',
                'string.max': 'Printer name must not exceed 100 characters'
            }),

        printerModel: Joi.string()
            .max(100)
            .optional()
            .allow(null, ''),

        printerType: Joi.string()
            .valid(...Object.values(PrinterType))
            .optional(),

        connectionType: Joi.string()
            .valid(...Object.values(PrinterConnectionType))
            .optional(),

        connectionAddress: Joi.string()
            .max(255)
            .optional()
            .allow(null, ''),

        port: Joi.number()
            .port()
            .optional()
            .allow(null),

        baudRate: Joi.number()
            .valid(9600, 19200, 38400, 57600, 115200)
            .optional()
            .allow(null),

        vendorId: Joi.string()
            .pattern(/^[0-9a-fA-F]{4}$/)
            .optional()
            .allow(null, ''),

        productId: Joi.string()
            .pattern(/^[0-9a-fA-F]{4}$/)
            .optional()
            .allow(null, ''),

        serialNumber: Joi.string()
            .max(100)
            .optional()
            .allow(null, ''),

        terminalId: Joi.string()
            .uuid()
            .optional()
            .allow(null, ''),

        isDefault: Joi.boolean()
            .optional(),

        isReceiptPrinter: Joi.boolean()
            .optional(),

        isLabelPrinter: Joi.boolean()
            .optional(),

        isKitchenPrinter: Joi.boolean()
            .optional(),

        isReportPrinter: Joi.boolean()
            .optional(),

        status: Joi.string()
            .valid(...Object.values(PrinterStatus))
            .optional(),

        configuration: Joi.object({
            paperWidth: Joi.number().valid(58, 80, 112).optional(),
            paperHeight: Joi.number().min(10).max(1000).optional(),
            dpi: Joi.number().valid(180, 203, 300, 600).optional(),
            fontSize: Joi.number().min(8).max(24).optional(),
            encoding: Joi.string().valid('UTF-8', 'CP437', 'CP850', 'CP858', 'CP866', 'CP1252').optional(),
            cutPaper: Joi.boolean().optional(),
            openCashDrawer: Joi.boolean().optional(),
            printLogo: Joi.boolean().optional(),
            logoUrl: Joi.string().uri().optional().allow(null, ''),
            headerLines: Joi.array().items(Joi.string().max(100)).max(10).optional(),
            footerLines: Joi.array().items(Joi.string().max(100)).max(10).optional(),
            printSpeed: Joi.number().min(1).max(10).optional(),
            darkness: Joi.number().min(1).max(10).optional(),
            marginTop: Joi.number().min(0).max(50).optional(),
            marginBottom: Joi.number().min(0).max(50).optional(),
            marginLeft: Joi.number().min(0).max(50).optional(),
            marginRight: Joi.number().min(0).max(50).optional(),
            beepAfterPrint: Joi.boolean().optional(),
            copies: Joi.number().min(1).max(99).optional(),
            lineSpacing: Joi.number().valid(1, 1.5, 2, 2.5).optional(),
            printMode: Joi.string().valid('normal', 'draft', 'high').optional(),
            autoPrintOnSale: Joi.boolean().optional()
        }).optional(),

        isActive: Joi.boolean()
            .optional()
    }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
    }),

    /**
     * Update printer status validation
     */
    updateStatus: Joi.object({
        status: Joi.string()
            .valid(...Object.values(PrinterStatus))
            .required()
            .messages({
                'any.only': `Status must be one of: ${Object.values(PrinterStatus).join(', ')}`,
                'any.required': 'Status is required'
            }),

        errorMessage: Joi.string()
            .max(500)
            .optional()
            .allow(null, '')
            .messages({
                'string.max': 'Error message must not exceed 500 characters'
            })
    }),

    /**
     * Print receipt validation
     */
    printReceipt: Joi.object({
        printerId: Joi.string()
            .uuid()
            .optional()
            .messages({
                'string.guid': 'Printer ID must be a valid UUID'
            }),

        saleId: Joi.string()
            .uuid()
            .optional()
            .messages({
                'string.guid': 'Sale ID must be a valid UUID'
            }),

        transactionId: Joi.string()
            .uuid()
            .optional()
            .messages({
                'string.guid': 'Transaction ID must be a valid UUID'
            }),

        orderId: Joi.string()
            .uuid()
            .optional()
            .messages({
                'string.guid': 'Order ID must be a valid UUID'
            }),

        copies: Joi.number()
            .min(1)
            .max(10)
            .optional()
            .default(1)
            .messages({
                'number.min': 'Copies must be at least 1',
                'number.max': 'Copies must not exceed 10'
            }),

        includeHeader: Joi.boolean()
            .optional()
            .default(true),

        includeFooter: Joi.boolean()
            .optional()
            .default(true),

        includeLogo: Joi.boolean()
            .optional()
            .default(true),

        customMessage: Joi.string()
            .max(500)
            .optional()
            .allow(null, '')
            .messages({
                'string.max': 'Custom message must not exceed 500 characters'
            })
    }).or('saleId', 'transactionId', 'orderId').messages({
        'object.missing': 'At least one of saleId, transactionId, or orderId is required'
    }),

    /**
     * Print label validation
     */
    printLabel: Joi.object({
        printerId: Joi.string()
            .uuid()
            .optional()
            .messages({
                'string.guid': 'Printer ID must be a valid UUID'
            }),

        productId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'Product ID must be a valid UUID',
                'any.required': 'Product ID is required'
            }),

        quantity: Joi.number()
            .min(1)
            .max(999)
            .required()
            .messages({
                'number.min': 'Quantity must be at least 1',
                'number.max': 'Quantity must not exceed 999',
                'any.required': 'Quantity is required'
            }),

        includePrice: Joi.boolean()
            .optional()
            .default(true),

        includeBarcode: Joi.boolean()
            .optional()
            .default(true),

        includeQRCode: Joi.boolean()
            .optional()
            .default(false),

        customText: Joi.string()
            .max(200)
            .optional()
            .allow(null, '')
            .messages({
                'string.max': 'Custom text must not exceed 200 characters'
            })
    }),

    /**
     * Create print job validation
     */
    createPrintJob: Joi.object({
        printerId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'Printer ID must be a valid UUID',
                'any.required': 'Printer ID is required'
            }),

        terminalId: Joi.string()
            .uuid()
            .optional()
            .allow(null, ''),

        userId: Joi.string()
            .uuid()
            .optional()
            .allow(null, ''),

        jobType: Joi.string()
            .valid(...Object.values(PrintJobType))
            .required()
            .messages({
                'any.only': `Job type must be one of: ${Object.values(PrintJobType).join(', ')}`,
                'any.required': 'Job type is required'
            }),

        jobTitle: Joi.string()
            .min(1)
            .max(200)
            .required()
            .messages({
                'string.min': 'Job title is required',
                'string.max': 'Job title must not exceed 200 characters',
                'any.required': 'Job title is required'
            }),

        content: Joi.string()
            .required()
            .messages({
                'any.required': 'Content is required'
            }),

        contentType: Joi.string()
            .valid('HTML', 'RAW', 'ESC_POS', 'ZPL')
            .optional()
            .default('RAW'),

        copies: Joi.number()
            .min(1)
            .max(99)
            .optional()
            .default(1),

        priority: Joi.number()
            .min(1)
            .max(10)
            .optional()
            .default(5),

        referenceId: Joi.string()
            .uuid()
            .optional()
            .allow(null, ''),

        referenceType: Joi.string()
            .valid('SALE', 'ORDER', 'RETURN', 'ADJUSTMENT', 'INVENTORY')
            .optional()
            .allow(null, ''),

        scheduledAt: Joi.date()
            .iso()
            .optional()
            .allow(null)
    }),

    /**
     * Network scan validation
     */
    scanNetwork: Joi.object({
        baseIP: Joi.string()
            .ip()
            .required()
            .messages({
                'string.ip': 'Base IP must be a valid IP address',
                'any.required': 'Base IP is required'
            }),

        startHost: Joi.number()
            .min(1)
            .max(254)
            .optional()
            .default(1),

        endHost: Joi.number()
            .min(1)
            .max(254)
            .optional()
            .default(254),

        port: Joi.number()
            .port()
            .optional()
            .default(9100)
    }),

    /**
     * Register discovered printer validation
     */
    registerDiscoveredPrinter: Joi.object({
        discoveredPrinter: Joi.object({
            name: Joi.string().required(),
            address: Joi.string().optional(),
            port: Joi.number().optional(),
            type: Joi.string().valid(...Object.values(PrinterType)).optional(),
            connectionType: Joi.string().valid(...Object.values(PrinterConnectionType)).required(),
            vendorId: Joi.string().optional(),
            productId: Joi.string().optional(),
            serialNumber: Joi.string().optional(),
            manufacturer: Joi.string().optional(),
            model: Joi.string().optional(),
            isOnline: Joi.boolean().optional()
        }).required(),

        printerName: Joi.string()
            .min(2)
            .max(100)
            .optional(),

        isDefault: Joi.boolean()
            .optional()
            .default(false),

        isReceiptPrinter: Joi.boolean()
            .optional()
            .default(true),

        isLabelPrinter: Joi.boolean()
            .optional()
            .default(false),

        isKitchenPrinter: Joi.boolean()
            .optional()
            .default(false)
    }),

    /**
     * Query params validation
     */
    queryParams: Joi.object({
        branchId: Joi.string().uuid().optional(),
        terminalId: Joi.string().uuid().optional(),
        printerType: Joi.string().valid(...Object.values(PrinterType)).optional(),
        connectionType: Joi.string().valid(...Object.values(PrinterConnectionType)).optional(),
        status: Joi.string().valid(...Object.values(PrinterStatus)).optional(),
        isDefault: Joi.boolean().optional(),
        isReceiptPrinter: Joi.boolean().optional(),
        isLabelPrinter: Joi.boolean().optional(),
        isKitchenPrinter: Joi.boolean().optional(),
        isReportPrinter: Joi.boolean().optional(),
        isActive: Joi.boolean().optional()
    }),

    /**
     * ID parameter validation
     */
    idParam: Joi.object({
        id: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID must be a valid UUID',
                'any.required': 'ID is required'
            })
    }),

    /**
     * Cleanup print jobs validation
     */
    cleanupPrintJobs: Joi.object({
        daysOld: Joi.number()
            .min(1)
            .max(365)
            .optional()
            .default(30)
            .messages({
                'number.min': 'Days must be at least 1',
                'number.max': 'Days must not exceed 365'
            })
    })
};

export default printerValidationSchemas;
