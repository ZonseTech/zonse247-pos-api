import { Router } from 'express';
import { MraController } from '../controllers/mra.controller';
import { asyncHandler } from '../middlewares/error.middleware';

const router: Router = Router();

/**
 * @route   POST /mra/activate
 * @desc    Activate terminal with TAC (Terminal Activation Code)
 * @body    { terminalId: string, tac: string, environment?: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/activate', asyncHandler(MraController.activateTerminal));

/**
 * @route   POST /mra/confirm-activation
 * @desc    Confirm terminal activation after config is persisted
 * @body    { terminalId: string, environment?: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/confirm-activation', asyncHandler(MraController.confirmActivation));

/**
 * @route   POST /mra/deactivate
 * @desc    Deactivate terminal with MRA (for terminal transfer/replacement)
 * @body    { terminalId: string, environment?: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/deactivate', asyncHandler(MraController.deactivateTerminal));

/**
 * @route   GET /mra/status/:terminalId
 * @desc    Get MRA onboarding status for a terminal
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/status/:terminalId', asyncHandler(MraController.getOnboardingStatus));

/**
 * @route   POST /mra/sync-config
 * @desc    Sync latest configuration from MRA (call at start of day/restart)
 * @body    { terminalId: string, environment?: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/sync-config', asyncHandler(MraController.syncConfig));

/**
 * @route   GET /mra/config
 * @desc    Get MRA API configuration for tenant
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/config', asyncHandler(MraController.getConfig));

/**
 * @route   POST /mra/config/init
 * @desc    Initialize MRA API configuration
 * @body    { environment?: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/config/init', asyncHandler(MraController.initConfig));

/**
 * @route   POST /mra/submit-sale
 * @desc    Submit sale/invoice to MRA
 * @body    { terminalId: string, saleData: MraSaleSubmissionRequest, environment?: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/submit-sale', asyncHandler(MraController.submitSale));

/**
 * @route   GET /mra/last-transaction/online/:terminalId
 * @desc    Get last online transaction submitted to MRA (from local DB)
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/last-transaction/online/:terminalId', asyncHandler(MraController.getLastOnlineTransaction));

/**
 * @route   GET /mra/last-transaction/offline/:terminalId
 * @desc    Get last offline transaction submitted to MRA (from local DB)
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/last-transaction/offline/:terminalId', asyncHandler(MraController.getLastOfflineTransaction));

/**
 * @route   GET /mra/last-transaction/online-mra/:terminalId
 * @desc    Get last online transaction from MRA API servers
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/last-transaction/online-mra/:terminalId', asyncHandler(MraController.getLastOnlineTransactionFromMra));

/**
 * @route   GET /mra/last-transaction/offline-mra/:terminalId
 * @desc    Get last offline transaction from MRA API servers
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/last-transaction/offline-mra/:terminalId', asyncHandler(MraController.getLastOfflineTransactionFromMra));

/**
 * @route   GET /mra/ping
 * @desc    Check MRA API connectivity
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/ping', asyncHandler(MraController.ping));

/**
 * @route   GET /mra/products/sync/:terminalId
 * @desc    Sync products/services from MRA terminal site
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/products/sync/:terminalId', asyncHandler(MraController.syncProducts));

/**
 * @route   GET /mra/product-status/:productCode
 * @desc    Check product status in MRA system
 * @param   productCode - Product code/SKU
 * @query   terminalId: string, environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/product-status/:productCode', asyncHandler(MraController.checkProductStatus));

/**
 * @route   POST /mra/validate-tin
 * @desc    Validate Taxpayer Identification Number (TIN)
 * @body    { terminalId: string, tin: string, environment?: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/validate-tin', asyncHandler(MraController.validateTin));

/**
 * @route   POST /mra/validate-vat5
 * @desc    Validate VAT 5 exemption certificate
 * @body    { terminalId: string, certificateNumber: string, supplierTin?: string, environment?: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/validate-vat5', asyncHandler(MraController.validateVat5Certificate));

/**
 * @route   GET /mra/blocking-message/:terminalId
 * @desc    Get terminal blocking message (check if blocked)
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/blocking-message/:terminalId', asyncHandler(MraController.getBlockingMessage));

/**
 * @route   GET /mra/unblock-status/:terminalId
 * @desc    Check terminal unblock status
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/unblock-status/:terminalId', asyncHandler(MraController.checkUnblockStatus));

/**
 * @route   GET /mra/compliance/status
 * @desc    Get MRA compliance status for tenant/terminal
 * @query   terminalId?: string - Optional terminal ID for terminal-specific status
 * @access  Protected
 */
router.get('/compliance/status', asyncHandler(MraController.getComplianceStatus));

/**
 * @route   POST /mra/compliance/enable
 * @desc    Enable MRA compliance for tenant
 * @body    { environment?: 'SANDBOX' | 'PRODUCTION', terminalId?: string, tac?: string  }
 * @access  Protected
 */
router.post('/compliance/enable', asyncHandler(MraController.enableMraCompliance));

/**
 * @route   POST /mra/compliance/disable
 * @desc    Disable MRA compliance for tenant
 * @access  Protected
 */
router.post('/compliance/disable', asyncHandler(MraController.disableMraCompliance));

/**
 * @route   POST /mra/compliance/environment
 * @desc    Switch MRA environment (SANDBOX <-> PRODUCTION)
 * @body    { environment: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/compliance/environment', asyncHandler(MraController.switchMraEnvironment));

/**
 * @route   POST /mra/sync-data
 * @desc    Manually trigger post-onboarding data sync (products, config, tenant info)
 * @body    { terminalId: string, environment?: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/sync-data', asyncHandler(MraController.syncMraData));

export default router;
