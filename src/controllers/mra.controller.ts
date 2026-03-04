/**
 * MRA EIS Controller
 * 
 * Handles MRA (Malawi Revenue Authority) Electronic Invoicing System integration endpoints.
 */

import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import {
    MraOnboardingService,
    MraConfigurationService,
    MraSalesService,
    MraStockService,
    MraUtilitiesService,
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
}
