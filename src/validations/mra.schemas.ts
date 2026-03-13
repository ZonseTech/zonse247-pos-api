/* eslint-disable @typescript-eslint/naming-convention */
/**
 * MRA EIS Validation Schemas
 * 
 * Joi validation schemas for MRA (Malawi Revenue Authority) Electronic Invoicing System endpoints.
 */

import Joi from 'joi';

export const mraValidationSchemas = {
    // ==================== ONBOARDING ====================

    /**
     * Activate terminal with TAC
     */
    activateTerminal: Joi.object({
        terminalId: Joi.string()
            .required()
            .messages({
                'string.empty': 'Terminal ID is required',
                'any.required': 'Terminal ID is required'
            }),
        tac: Joi.string()
            .pattern(/^[A-Za-z0-9-]{8,50}$/)
            .required()
            .messages({
                'string.empty': 'Terminal Activation Code (TAC) is required',
                'string.pattern.base': 'Invalid TAC format. TAC should be 8-50 alphanumeric characters with optional dashes.',
                'any.required': 'Terminal Activation Code (TAC) is required'
            }),
        environment: Joi.string()
            .valid('SANDBOX', 'PRODUCTION')
            .default('SANDBOX')
            .messages({
                'any.only': 'Environment must be SANDBOX or PRODUCTION'
            })
    }),

    /**
     * Confirm terminal activation
     */
    confirmActivation: Joi.object({
        terminalId: Joi.string()
            .required()
            .messages({
                'string.empty': 'Terminal ID is required',
                'any.required': 'Terminal ID is required'
            }),
        environment: Joi.string()
            .valid('SANDBOX', 'PRODUCTION')
            .default('SANDBOX')
            .messages({
                'any.only': 'Environment must be SANDBOX or PRODUCTION'
            })
    }),

    /**
     * Deactivate terminal
     */
    deactivateTerminal: Joi.object({
        terminalId: Joi.string()
            .required()
            .messages({
                'string.empty': 'Terminal ID is required',
                'any.required': 'Terminal ID is required'
            }),
        environment: Joi.string()
            .valid('SANDBOX', 'PRODUCTION')
            .default('SANDBOX')
            .messages({
                'any.only': 'Environment must be SANDBOX or PRODUCTION'
            })
    }),

    // ==================== CONFIGURATION ====================

    /**
     * Sync configuration
     */
    syncConfig: Joi.object({
        terminalId: Joi.string()
            .required()
            .messages({
                'string.empty': 'Terminal ID is required',
                'any.required': 'Terminal ID is required'
            }),
        environment: Joi.string()
            .valid('SANDBOX', 'PRODUCTION')
            .default('SANDBOX')
            .messages({
                'any.only': 'Environment must be SANDBOX or PRODUCTION'
            })
    }),

    /**
     * Initialize config
     */
    initConfig: Joi.object({
        environment: Joi.string()
            .valid('SANDBOX', 'PRODUCTION')
            .default('SANDBOX')
            .messages({
                'any.only': 'Environment must be SANDBOX or PRODUCTION'
            })
    }),

    // ==================== SALES ====================

    /**
     * Sale item validation
     */
    saleItem: Joi.object({
        itemNo: Joi.number()
            .integer()
            .positive()
            .required()
            .messages({
                'number.base': 'Item number must be a number',
                'number.integer': 'Item number must be an integer',
                'number.positive': 'Item number must be positive',
                'any.required': 'Item number is required'
            }),
        itemCode: Joi.string()
            .max(50)
            .required()
            .messages({
                'string.empty': 'Item code is required',
                'string.max': 'Item code must not exceed {#limit} characters',
                'any.required': 'Item code is required'
            }),
        itemDesc: Joi.string()
            .max(255)
            .required()
            .messages({
                'string.empty': 'Item description is required',
                'any.required': 'Item description is required'
            }),
        quantity: Joi.number()
            .positive()
            .required()
            .messages({
                'number.base': 'Quantity must be a number',
                'number.positive': 'Quantity must be positive',
                'any.required': 'Quantity is required'
            }),
        unitOfMeasure: Joi.string()
            .max(20)
            .required()
            .messages({
                'string.empty': 'Unit of measure is required',
                'any.required': 'Unit of measure is required'
            }),
        unitPrice: Joi.number()
            .min(0)
            .required()
            .messages({
                'number.base': 'Unit price must be a number',
                'number.min': 'Unit price cannot be negative',
                'any.required': 'Unit price is required'
            }),
        discountAmount: Joi.number()
            .min(0)
            .default(0),
        taxCode: Joi.string()
            .max(10)
            .required()
            .messages({
                'string.empty': 'Tax code is required',
                'any.required': 'Tax code is required'
            }),
        taxAmount: Joi.number()
            .min(0)
            .required()
            .messages({
                'number.base': 'Tax amount must be a number',
                'number.min': 'Tax amount cannot be negative',
                'any.required': 'Tax amount is required'
            }),
        totalAmount: Joi.number()
            .min(0)
            .required()
            .messages({
                'number.base': 'Total amount must be a number',
                'number.min': 'Total amount cannot be negative',
                'any.required': 'Total amount is required'
            }),
        hsCode: Joi.string()
            .max(20)
            .optional()
    }),

    /**
     * Payment info validation
     */
    paymentInfo: Joi.object({
        paymentMethod: Joi.string()
            .valid('CASH', 'CARD', 'MOBILE', 'CREDIT', 'CHEQUE', 'BANK_TRANSFER', 'OTHER')
            .required()
            .messages({
                'string.empty': 'Payment method is required',
                'any.only': 'Invalid payment method',
                'any.required': 'Payment method is required'
            }),
        amount: Joi.number()
            .min(0)
            .required()
            .messages({
                'number.base': 'Amount must be a number',
                'number.min': 'Amount cannot be negative',
                'any.required': 'Amount is required'
            }),
        reference: Joi.string()
            .max(100)
            .optional(),
        cardType: Joi.string()
            .valid('VISA', 'MASTERCARD', 'AMEX', 'OTHER')
            .optional(),
        cardLastFourDigits: Joi.string()
            .pattern(/^\d{4}$/)
            .optional()
            .messages({
                'string.pattern.base': 'Card last four digits must be exactly 4 digits'
            })
    }),

    /**
     * Tax summary validation
     */
    taxSummary: Joi.object({
        taxCode: Joi.string()
            .max(10)
            .required(),
        taxableAmount: Joi.number()
            .min(0)
            .required(),
        taxAmount: Joi.number()
            .min(0)
            .required()
    }),

    /**
     * Submit sale request
     */
    submitSale: Joi.object({
        terminalId: Joi.string()
            .required()
            .messages({
                'string.empty': 'Terminal ID is required',
                'any.required': 'Terminal ID is required'
            }),
        saleData: Joi.object({
            invoiceNumber: Joi.string()
                .max(50)
                .required()
                .messages({
                    'string.empty': 'Invoice number is required',
                    'any.required': 'Invoice number is required'
                }),
            invoiceType: Joi.string()
                .valid('NORMAL', 'COPY', 'TRAINING', 'PROFORMA')
                .default('NORMAL')
                .messages({
                    'any.only': 'Invoice type must be NORMAL, COPY, TRAINING, or PROFORMA'
                }),
            transactionType: Joi.string()
                .valid('SALE', 'REFUND', 'VOID')
                .default('SALE')
                .messages({
                    'any.only': 'Transaction type must be SALE, REFUND, or VOID'
                }),
            transactionDate: Joi.date()
                .required()
                .messages({
                    'date.base': 'Transaction date must be a valid date',
                    'any.required': 'Transaction date is required'
                }),
            transactionTime: Joi.string()
                .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
                .required()
                .messages({
                    'string.pattern.base': 'Transaction time must be in HH:mm:ss format',
                    'any.required': 'Transaction time is required'
                }),
            customerTpin: Joi.string()
                .max(20)
                .optional(),
            customerName: Joi.string()
                .max(100)
                .optional(),
            customerAddress: Joi.string()
                .max(255)
                .optional(),
            items: Joi.array()
                .items(Joi.link('#saleItem'))
                .min(1)
                .required()
                .messages({
                    'array.min': 'At least one item is required',
                    'any.required': 'Items are required'
                }),
            subtotal: Joi.number()
                .min(0)
                .required(),
            totalDiscount: Joi.number()
                .min(0)
                .default(0),
            totalTax: Joi.number()
                .min(0)
                .required(),
            totalAmount: Joi.number()
                .min(0)
                .required(),
            taxSummary: Joi.array()
                .items(Joi.link('#taxSummary'))
                .min(1)
                .required(),
            payments: Joi.array()
                .items(Joi.link('#paymentInfo'))
                .min(1)
                .required()
                .messages({
                    'array.min': 'At least one payment is required',
                    'any.required': 'Payments are required'
                }),
            amountPaid: Joi.number()
                .min(0)
                .required(),
            changeAmount: Joi.number()
                .min(0)
                .default(0),
            isOffline: Joi.boolean()
                .default(false),
            offlineSignature: Joi.string()
                .optional(),
            offlineQrData: Joi.string()
                .optional(),
            originalInvoiceNumber: Joi.string()
                .when('transactionType', {
                    is: Joi.valid('REFUND', 'VOID'),
                    then: Joi.required(),
                    otherwise: Joi.optional()
                })
                .messages({
                    'any.required': 'Original invoice number is required for refunds and voids'
                }),
            remarks: Joi.string()
                .max(500)
                .optional()
        }).required()
            .messages({
                'any.required': 'Sale data is required'
            }),
        environment: Joi.string()
            .valid('SANDBOX', 'PRODUCTION')
            .default('SANDBOX')
    }).shared(
        Joi.object({
            itemNo: Joi.number().integer().positive().required(),
            itemCode: Joi.string().max(50).required(),
            itemDesc: Joi.string().max(255).required(),
            quantity: Joi.number().positive().required(),
            unitOfMeasure: Joi.string().max(20).required(),
            unitPrice: Joi.number().min(0).required(),
            discountAmount: Joi.number().min(0).default(0),
            taxCode: Joi.string().max(10).required(),
            taxAmount: Joi.number().min(0).required(),
            totalAmount: Joi.number().min(0).required(),
            hsCode: Joi.string().max(20).optional()
        }).id('saleItem')
    ).shared(
        Joi.object({
            taxCode: Joi.string().max(10).required(),
            taxableAmount: Joi.number().min(0).required(),
            taxAmount: Joi.number().min(0).required()
        }).id('taxSummary')
    ).shared(
        Joi.object({
            paymentMethod: Joi.string().valid('CASH', 'CARD', 'MOBILE', 'CREDIT', 'CHEQUE', 'BANK_TRANSFER', 'OTHER').required(),
            amount: Joi.number().min(0).required(),
            reference: Joi.string().max(100).optional(),
            cardType: Joi.string().valid('VISA', 'MASTERCARD', 'AMEX', 'OTHER').optional(),
            cardLastFourDigits: Joi.string().pattern(/^\d{4}$/).optional()
        }).id('paymentInfo')
    ),

    // ==================== UTILITIES ====================

    /**
     * Validate TIN
     */
    validateTin: Joi.object({
        terminalId: Joi.string()
            .required()
            .messages({
                'string.empty': 'Terminal ID is required',
                'any.required': 'Terminal ID is required'
            }),
        tin: Joi.string()
            .pattern(/^[A-Z0-9]{6,15}$/i)
            .required()
            .messages({
                'string.empty': 'TIN is required',
                'string.pattern.base': 'Invalid TIN format. TIN should be 6-15 alphanumeric characters.',
                'any.required': 'TIN is required'
            }),
        environment: Joi.string()
            .valid('SANDBOX', 'PRODUCTION')
            .default('SANDBOX')
    }),

    /**
     * Validate VAT 5 Certificate
     */
    validateVat5: Joi.object({
        terminalId: Joi.string()
            .required()
            .messages({
                'string.empty': 'Terminal ID is required',
                'any.required': 'Terminal ID is required'
            }),
        certificateNumber: Joi.string()
            .max(50)
            .required()
            .messages({
                'string.empty': 'Certificate number is required',
                'any.required': 'Certificate number is required'
            }),
        supplierTin: Joi.string()
            .pattern(/^[A-Z0-9]{6,15}$/i)
            .optional()
            .messages({
                'string.pattern.base': 'Invalid supplier TIN format'
            }),
        environment: Joi.string()
            .valid('SANDBOX', 'PRODUCTION')
            .default('SANDBOX')
    }),

    // ==================== QUERY PARAMS ====================

    /**
     * Terminal ID path param
     */
    terminalIdParam: Joi.object({
        terminalId: Joi.string()
            .required()
            .messages({
                'string.empty': 'Terminal ID is required',
                'any.required': 'Terminal ID is required'
            })
    }),

    /**
     * Product code path param
     */
    productCodeParam: Joi.object({
        productCode: Joi.string()
            .required()
            .messages({
                'string.empty': 'Product code is required',
                'any.required': 'Product code is required'
            })
    }),

    /**
     * Environment query param
     */
    environmentQuery: Joi.object({
        environment: Joi.string()
            .valid('SANDBOX', 'PRODUCTION')
            .default('SANDBOX')
            .messages({
                'any.only': 'Environment must be SANDBOX or PRODUCTION'
            })
    }),

    /**
     * Product status query params
     */
    productStatusQuery: Joi.object({
        terminalId: Joi.string()
            .required()
            .messages({
                'string.empty': 'Terminal ID is required',
                'any.required': 'Terminal ID is required'
            }),
        environment: Joi.string()
            .valid('SANDBOX', 'PRODUCTION')
            .default('SANDBOX')
    })
};

export default mraValidationSchemas;
