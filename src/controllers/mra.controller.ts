import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import {
    MraOnboardingService,
    MraConfigurationService,
    MraSalesService,
    MraStockService,
    MraUtilitiesService,
    MraComplianceService,
    MraPostOnboardingService,
} from '../services/mra';
import { MraEnvironment, MraSaleSubmissionRequest } from '../types/mra.types';
import { AuthRequest, getEffectiveBranchId, getParam } from '../lib/express.type';

interface ActivateTerminalBody {
    terminalId: string;
    tac: string;  // Terminal Activation Code
    environment?: MraEnvironment;
}

interface ConfirmActivationBody {
    terminalId: string;
    environment?: MraEnvironment;
}

interface SyncConfigBody {
    terminalId: string;
    environment?: MraEnvironment;
}

interface SubmitSaleBody {
    terminalId: string;
    saleData: MraSaleSubmissionRequest;
    environment?: MraEnvironment;
}

interface ValidateTinBody {
    terminalId: string;
    tin: string;
    environment?: MraEnvironment;
}

interface ValidateVat5Body {
    terminalId: string;
    certificateNumber: string;
    supplierTin?: string;
    environment?: MraEnvironment;
}

/**
 * MRA EIS Controller for Electronic Invoicing System integration
 */
export class MraController extends BaseController {
    /**
     * Activate terminal with MRA using TAC (Terminal Activation Code)
     * @route POST /mra/activate
     */
    static async activateTerminal(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { terminalId, tac, environment } = req.body as ActivateTerminalBody;
            const tenantId = req.auth?.tenantId || '';
            const branchId = getEffectiveBranchId(req.auth);

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            if (!tac) {
                MraController.sendResponse(res, 400, false, 'Terminal Activation Code (TAC) is required');
                return;
            }

            const tacRegex = /^[A-Za-z0-9]{8,20}$/;
            if (!tacRegex.test(tac)) {
                MraController.sendResponse(res, 400, false, 'Invalid TAC format. TAC should be 8-20 alphanumeric characters.');
                return;
            }

            const result = await MraOnboardingService.activateTerminal({
                tenantId,
                branchId,
                terminalId,
                tac,
                environment: environment || MraEnvironment.SANDBOX,
            });

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message);
                return;
            }

            MraController.sendSuccess(res, result.message, {
                mraTerminalId: result.mraTerminalId,
                taxpayerInfo: result.taxpayerInfo,
                requiresConfirmation: result.requiresConfirmation,
            });

        } catch (error: unknown) {
            console.error('[MRA] Activate terminal error:', error);
            MraController.sendServerError(res, 'Failed to activate terminal with MRA');
        }
    }

    /**
     * Confirm terminal activation with MRA
     * 
     * Step 2 of MRA onboarding:
     * After successfully persisting configuration, terminal confirms activation.
     * TAC expires after successful confirmation.
     * 
     * @route POST /mra/confirm-activation
     */
    static async confirmActivation(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { terminalId, environment } = req.body as ConfirmActivationBody;
            const tenantId = req.auth?.tenantId || '';

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraOnboardingService.confirmActivation(
                tenantId,
                terminalId,
                environment || MraEnvironment.SANDBOX
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message);
                return;
            }

            MraController.sendSuccess(res, result.message);

        } catch (error: unknown) {
            console.error('[MRA] Confirm activation error:', error);
            MraController.sendServerError(res, 'Failed to confirm terminal activation');
        }
    }

    // ==================== CONFIGURATION ====================

    /**
     * Sync latest configuration from MRA
     * 
     * Should be called:
     * - At the start of each business day
     * - When terminal is restarted
     * - Periodically for configuration updates
     * 
     * @route POST /mra/sync-config
     */
    static async syncConfig(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { terminalId, environment } = req.body as SyncConfigBody;
            const tenantId = req.auth?.tenantId || '';

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraConfigurationService.getLatestConfig(
                tenantId,
                terminalId,
                environment || MraEnvironment.SANDBOX
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message);
                return;
            }

            MraController.sendSuccess(res, 'Configuration synced successfully', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Sync config error:', error);
            MraController.sendServerError(res, 'Failed to sync MRA configuration');
        }
    }

    // ==================== STATUS & MONITORING ====================

    /**
     * Get MRA onboarding status for a terminal
     * 
     * Returns current status of MRA integration including:
     * - Whether TAC has been used
     * - Whether configuration is persisted
     * - Whether activation is confirmed
     * - Last config sync timestamp
     * 
     * @route GET /mra/status/:terminalId
     */
    static async getOnboardingStatus(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = getParam(req.params.terminalId);
            const tenantId = req.auth?.tenantId || '';
            const branchId = getEffectiveBranchId(req.auth);
            const environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const status = await MraOnboardingService.getOnboardingStatus(
                tenantId,
                branchId,
                terminalId,
                environment
            );

            MraController.sendSuccess(res, 'MRA onboarding status retrieved', status);

        } catch (error: unknown) {
            console.error('[MRA] Get onboarding status error:', error);
            MraController.sendServerError(res, 'Failed to get MRA onboarding status');
        }
    }

    /**
     * Check MRA API connectivity (ping)
     * 
     * @route GET /mra/ping
     */
    static async ping(req: Request, res: Response): Promise<void> {
        try {
            const environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            const result = await MraUtilitiesService.getServiceHealth(environment);

            if (!result.reachable) {
                MraController.sendResponse(res, 503, false, 'MRA API is not available', result);
                return;
            }

            MraController.sendSuccess(res, 'MRA API is available', { success: true, ...result });

        } catch (error: unknown) {
            console.error('[MRA] Ping error:', error);
            MraController.sendResponse(res, 503, false, 'Failed to reach MRA API');
        }
    }

    // ==================== SALES SUBMISSION ====================

    /**
     * Submit a sale/invoice to MRA
     * 
     * For every sale, terminal must submit invoice data to MRA.
     * MRA returns verification signature and QR code data for the receipt.
     * 
     * @route POST /mra/submit-sale
     */
    static async submitSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { terminalId, saleData, environment } = req.body as SubmitSaleBody;
            const tenantId = req.auth?.tenantId || '';

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            if (!saleData) {
                MraController.sendResponse(res, 400, false, 'Sale data is required');
                return;
            }

            // Basic validation
            if (!saleData.invoiceNumber) {
                MraController.sendResponse(res, 400, false, 'Invoice number is required');
                return;
            }

            if (!saleData.items || saleData.items.length === 0) {
                MraController.sendResponse(res, 400, false, 'Sale must have at least one item');
                return;
            }

            const result = await MraSalesService.submitSale(
                tenantId,
                terminalId,
                saleData,
                environment || MraEnvironment.SANDBOX
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message);
                return;
            }

            MraController.sendSuccess(res, 'Sale submitted to MRA successfully', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Submit sale error:', error);
            MraController.sendServerError(res, 'Failed to submit sale to MRA');
        }
    }

    // ==================== TRANSACTION HISTORY ====================

    /**
     * Get last online transaction submitted to MRA
     * 
     * @route GET /mra/last-transaction/online/:terminalId
     */
    static async getLastOnlineTransaction(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = getParam(req.params.terminalId);
            const tenantId = req.auth?.tenantId || '';
            const _environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraUtilitiesService.getLastOnlineTransaction(
                tenantId,
                terminalId
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message || 'Failed to get last transaction');
                return;
            }

            MraController.sendSuccess(res, 'Last online transaction retrieved', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Get last online transaction error:', error);
            MraController.sendServerError(res, 'Failed to get last online transaction');
        }
    }

    /**
     * Get last offline transaction submitted to MRA
     * 
     * @route GET /mra/last-transaction/offline/:terminalId
     */
    static async getLastOfflineTransaction(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = getParam(req.params.terminalId);
            const tenantId = req.auth?.tenantId || '';
            const _environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraUtilitiesService.getLastOfflineTransaction(
                tenantId,
                terminalId
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message || 'Failed to get last transaction');
                return;
            }

            MraController.sendSuccess(res, 'Last offline transaction retrieved', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Get last offline transaction error:', error);
            MraController.sendServerError(res, 'Failed to get last offline transaction');
        }
    }

    // ==================== PRODUCT STATUS ====================

    /**
     * Check product status in MRA system
     * 
     * Checks if a product is mapped to MRA standardized category codes.
     * 
     * @route GET /mra/product-status/:productCode
     */
    static async checkProductStatus(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const productCode = getParam(req.params.productCode);
            const terminalId = getParam(req.query.terminalId as string);
            const tenantId = req.auth?.tenantId || '';
            const environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!productCode) {
                MraController.sendResponse(res, 400, false, 'Product code is required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraStockService.checkProductStatus(
                tenantId,
                terminalId,
                productCode,
                environment
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.error?.message || 'Failed to check product status');
                return;
            }

            MraController.sendSuccess(res, 'Product status retrieved', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Check product status error:', error);
            MraController.sendServerError(res, 'Failed to check product status');
        }
    }

    // ==================== CONFIGURATION MANAGEMENT ====================

    /**
     * Get MRA API configuration for tenant
     * 
     * @route GET /mra/config
     */
    static async getConfig(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth?.tenantId || '';
            const environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            const config = await MraConfigurationService.getApiConfig(tenantId, environment);

            if (!config) {
                MraController.sendResponse(res, 404, false, 'MRA configuration not found');
                return;
            }

            // Don't expose sensitive data
            MraController.sendSuccess(res, 'MRA configuration retrieved', {
                configId: config.configId,
                tenantId: config.tenantId,
                environment: config.environment,
                apiBaseUrl: config.apiBaseUrl,
                isActive: config.isActive,
                lastSyncTimestamp: config.lastSyncTimestamp,
                syncStatus: config.syncStatus,
                hasApiKey: !!config.apiKey,
                createdAt: config.createdAt,
                updatedAt: config.updatedAt,
            });

        } catch (error: unknown) {
            console.error('[MRA] Get config error:', error);
            MraController.sendServerError(res, 'Failed to get MRA configuration');
        }
    }

    /**
     * Initialize MRA API configuration for tenant
     * 
     * Creates default configuration if not exists.
     * 
     * @route POST /mra/config/init
     */
    static async initConfig(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth?.tenantId || '';
            const { environment } = req.body as { environment?: MraEnvironment };

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            const config = await MraConfigurationService.ensureApiConfig(
                tenantId,
                environment || MraEnvironment.SANDBOX
            );

            MraController.sendSuccess(res, 'MRA configuration initialized', {
                configId: config.configId,
                tenantId: config.tenantId,
                environment: config.environment,
                apiBaseUrl: config.apiBaseUrl,
                isActive: config.isActive,
            });

        } catch (error: unknown) {
            console.error('[MRA] Init config error:', error);
            MraController.sendServerError(res, 'Failed to initialize MRA configuration');
        }
    }

    // ==================== UTILITIES ====================

    /**
     * Sync products from MRA terminal site
     * 
     * Downloads all approved products/services from MRA.
     * 
     * @route GET /mra/products/sync/:terminalId
     */
    static async syncProducts(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = getParam(req.params.terminalId);
            const tenantId = req.auth?.tenantId || '';
            const environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraUtilitiesService.getTerminalSiteProducts(
                tenantId,
                terminalId,
                environment
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message || 'Failed to sync products');
                return;
            }

            MraController.sendSuccess(res, 'Products synced from MRA', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Sync products error:', error);
            MraController.sendServerError(res, 'Failed to sync products from MRA');
        }
    }

    /**
     * Validate TIN (Taxpayer Identification Number)
     * 
     * @route POST /mra/validate-tin
     */
    static async validateTin(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { terminalId, tin, environment } = req.body as ValidateTinBody;
            const tenantId = req.auth?.tenantId || '';

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            if (!tin) {
                MraController.sendResponse(res, 400, false, 'TIN is required');
                return;
            }

            // Basic TIN format validation (adjust pattern as needed for Malawi TINs)
            const tinRegex = /^[A-Z0-9]{6,15}$/i;
            if (!tinRegex.test(tin)) {
                MraController.sendResponse(res, 400, false, 'Invalid TIN format');
                return;
            }

            const result = await MraUtilitiesService.validateTin(
                tenantId,
                terminalId,
                tin,
                environment || MraEnvironment.SANDBOX
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message || 'TIN validation failed');
                return;
            }

            MraController.sendSuccess(res, 'TIN validated successfully', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Validate TIN error:', error);
            MraController.sendServerError(res, 'Failed to validate TIN');
        }
    }

    /**
     * Get terminal blocking message
     * 
     * Checks if terminal is blocked and returns the reason.
     * 
     * @route GET /mra/blocking-message/:terminalId
     */
    static async getBlockingMessage(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = getParam(req.params.terminalId);
            const tenantId = req.auth?.tenantId || '';
            const environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraUtilitiesService.getBlockingMessage(
                tenantId,
                terminalId,
                environment
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message || 'Failed to get blocking message');
                return;
            }

            MraController.sendSuccess(res, 'Blocking status retrieved', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Get blocking message error:', error);
            MraController.sendServerError(res, 'Failed to get terminal blocking message');
        }
    }

    /**
     * Check terminal unblock status
     * 
     * Checks if a previously blocked terminal has been unblocked.
     * 
     * @route GET /mra/unblock-status/:terminalId
     */
    static async checkUnblockStatus(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = getParam(req.params.terminalId);
            const tenantId = req.auth?.tenantId || '';
            const environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraUtilitiesService.checkUnblockStatus(
                tenantId,
                terminalId,
                environment
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message || 'Failed to check unblock status');
                return;
            }

            MraController.sendSuccess(res, 'Unblock status retrieved', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Check unblock status error:', error);
            MraController.sendServerError(res, 'Failed to check terminal unblock status');
        }
    }

    /**
     * Validate VAT 5 Certificate
     * 
     * Validates a VAT 5 exemption certificate.
     * 
     * @route POST /mra/validate-vat5
     */
    static async validateVat5Certificate(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { terminalId, certificateNumber, supplierTin, environment } = req.body as ValidateVat5Body;
            const tenantId = req.auth?.tenantId || '';

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            if (!certificateNumber) {
                MraController.sendResponse(res, 400, false, 'Certificate number is required');
                return;
            }

            const result = await MraUtilitiesService.validateVat5Certificate(
                tenantId,
                terminalId,
                certificateNumber,
                supplierTin,
                environment || MraEnvironment.SANDBOX
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message || 'VAT 5 certificate validation failed');
                return;
            }

            MraController.sendSuccess(res, 'VAT 5 certificate validated', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Validate VAT 5 certificate error:', error);
            MraController.sendServerError(res, 'Failed to validate VAT 5 certificate');
        }
    }

    /**
     * Get last online transaction from MRA API
     * 
     * Retrieves the last online transaction directly from MRA servers.
     * 
     * @route GET /mra/last-transaction/online-mra/:terminalId
     */
    static async getLastOnlineTransactionFromMra(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = getParam(req.params.terminalId);
            const tenantId = req.auth?.tenantId || '';
            const environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraUtilitiesService.getLastOnlineTransactionFromMra(
                tenantId,
                terminalId,
                environment
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message || 'Failed to get last transaction');
                return;
            }

            MraController.sendSuccess(res, 'Last online transaction retrieved from MRA', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Get last online transaction from MRA error:', error);
            MraController.sendServerError(res, 'Failed to get last online transaction from MRA');
        }
    }

    /**
     * Get last offline transaction from MRA API
     * 
     * Retrieves the last offline transaction synced to MRA servers.
     * 
     * @route GET /mra/last-transaction/offline-mra/:terminalId
     */
    static async getLastOfflineTransactionFromMra(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = getParam(req.params.terminalId);
            const tenantId = req.auth?.tenantId || '';
            const environment = (req.query.environment as MraEnvironment) || MraEnvironment.SANDBOX;

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraUtilitiesService.getLastOfflineTransactionFromMra(
                tenantId,
                terminalId,
                environment
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message || 'Failed to get last transaction');
                return;
            }

            MraController.sendSuccess(res, 'Last offline transaction retrieved from MRA', result.data);

        } catch (error: unknown) {
            console.error('[MRA] Get last offline transaction from MRA error:', error);
            MraController.sendServerError(res, 'Failed to get last offline transaction from MRA');
        }
    }

    /**
     * Deactivate terminal with MRA
     * 
     * Used for terminal transfer or replacement.
     * 
     * @route POST /mra/deactivate
     */
    static async deactivateTerminal(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { terminalId, environment } = req.body as ConfirmActivationBody;
            const tenantId = req.auth?.tenantId || '';

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraOnboardingService.deactivateTerminal(
                tenantId,
                terminalId,
                environment || MraEnvironment.SANDBOX
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message);
                return;
            }

            MraController.sendSuccess(res, result.message);

        } catch (error: unknown) {
            console.error('[MRA] Deactivate terminal error:', error);
            MraController.sendServerError(res, 'Failed to deactivate terminal');
        }
    }

    // ==========================================
    // MRA COMPLIANCE MANAGEMENT ENDPOINTS
    // ==========================================

    /**
     * Get MRA compliance status for current tenant/terminal
     * 
     * Returns whether MRA is enabled and terminal activation status.
     * 
     * @route GET /mra/compliance/status
     */
    static async getComplianceStatus(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth?.tenantId || '';
            const terminalId = getParam(req.query.terminalId as string | undefined);

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            const status = await MraComplianceService.getComplianceStatus(
                tenantId,
                terminalId || undefined
            );

            MraController.sendSuccess(res, 'MRA compliance status retrieved', status);

        } catch (error: unknown) {
            console.error('[MRA] Get compliance status error:', error);
            MraController.sendServerError(res, 'Failed to get MRA compliance status');
        }
    }

    /**
     * Enable MRA compliance for tenant
     * 
     * Activates MRA submission requirements for all sales.
     * If TAC and terminalId are provided, also activates the terminal with MRA.
     * 
     * @route POST /mra/compliance/enable
     * @body { environment?: 'SANDBOX' | 'PRODUCTION', terminalId?: string, tac?: string }
     */
    static async enableMraCompliance(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth?.tenantId || '';
            const branchId = getEffectiveBranchId(req.auth);
            const { environment, terminalId, tac } = req.body as {
                environment?: MraEnvironment;
                terminalId?: string;
                tac?: string;
            };

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (tac && !terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required when providing TAC');
                return;
            }

            if (tac) {
                const tacRegex = /^[A-Za-z0-9-]{8,20}$/;
                if (!tacRegex.test(tac)) {
                    MraController.sendResponse(res, 400, false, 'Invalid TAC format. TAC should be 8-20 alphanumeric characters (dashes allowed).');
                    return;
                }
            }

            const result = await MraComplianceService.enableMraCompliance(
                tenantId,
                environment || MraEnvironment.SANDBOX,
                { terminalId, tac, branchId }
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message);
                return;
            }

            MraController.sendSuccess(res, result.message, {
                mraTerminalId: result.mraTerminalId,
                taxpayerInfo: result.taxpayerInfo,
                requiresConfirmation: !!result.mraTerminalId,
            });

        } catch (error: unknown) {
            console.error('[MRA] Enable compliance error:', error);
            MraController.sendServerError(res, 'Failed to enable MRA compliance');
        }
    }

    /**
     * Disable MRA compliance for tenant
     * 
     * Turns off MRA submission requirements.
     * Existing sales remain unchanged, future sales marked as NOT_APPLICABLE.
     * 
     * @route POST /mra/compliance/disable
     */
    static async disableMraCompliance(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth?.tenantId || '';

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            const result = await MraComplianceService.disableMraCompliance(tenantId);

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message);
                return;
            }

            MraController.sendSuccess(res, result.message);

        } catch (error: unknown) {
            console.error('[MRA] Disable compliance error:', error);
            MraController.sendServerError(res, 'Failed to disable MRA compliance');
        }
    }

    /**
     * Switch MRA environment (SANDBOX <-> PRODUCTION)
     * 
     * Changes the MRA API environment for the tenant.
     * MRA compliance must be enabled first.
     * 
     * @route POST /mra/compliance/environment
     */
    static async switchMraEnvironment(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth?.tenantId || '';
            const { environment } = req.body as { environment: MraEnvironment };

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!environment) {
                MraController.sendResponse(res, 400, false, 'Environment is required (SANDBOX or PRODUCTION)');
                return;
            }

            const result = await MraComplianceService.switchMraEnvironment(tenantId, environment);

            if (!result.success) {
                MraController.sendResponse(res, 400, false, result.message);
                return;
            }

            MraController.sendSuccess(res, result.message);

        } catch (error: unknown) {
            console.error('[MRA] Switch environment error:', error);
            MraController.sendServerError(res, 'Failed to switch MRA environment');
        }
    }

    /**
     * Manually trigger post-onboarding sync for a terminal
     * 
     * Syncs products, configuration, and tenant info from MRA.
     * Useful for retrying failed syncs or refreshing data.
     * 
     * @route POST /mra/sync-data
     */
    static async syncMraData(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth?.tenantId || '';
            const { terminalId, environment } = req.body as {
                terminalId: string;
                environment?: MraEnvironment
            };

            if (!tenantId) {
                MraController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!terminalId) {
                MraController.sendResponse(res, 400, false, 'Terminal ID is required');
                return;
            }

            const result = await MraPostOnboardingService.triggerSync(
                tenantId,
                terminalId,
                environment || MraEnvironment.SANDBOX
            );

            if (!result.success) {
                MraController.sendResponse(res, 400, false, 'Sync completed with errors', result);
                return;
            }

            MraController.sendSuccess(res, 'MRA data synced successfully', result);

        } catch (error: unknown) {
            console.error('[MRA] Sync data error:', error);
            MraController.sendServerError(res, 'Failed to sync MRA data');
        }
    }
}
