/**
 * MRA EIS (Electronic Invoicing System) Routes
 */

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
 * @route   GET /mra/status/:terminalId
 * @desc    Get MRA onboarding status for a terminal
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/status/:terminalId', asyncHandler(MraController.getOnboardingStatus));

/**
 * @route   GET /mra/ping
 * @desc    Check MRA API connectivity
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/ping', asyncHandler(MraController.ping));

/**
 * @route   POST /mra/submit-sale
 * @desc    Submit sale/invoice to MRA
 * @body    { terminalId: string, saleData: MraSaleSubmissionRequest, environment?: 'SANDBOX' | 'PRODUCTION' }
 * @access  Protected
 */
router.post('/submit-sale', asyncHandler(MraController.submitSale));

/**
 * @route   GET /mra/last-transaction/online/:terminalId
 * @desc    Get last online transaction submitted to MRA
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/last-transaction/online/:terminalId', asyncHandler(MraController.getLastOnlineTransaction));

/**
 * @route   GET /mra/last-transaction/offline/:terminalId
 * @desc    Get last offline transaction submitted to MRA
 * @param   terminalId - Terminal ID
 * @query   environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/last-transaction/offline/:terminalId', asyncHandler(MraController.getLastOfflineTransaction));

/**
 * @route   GET /mra/product-status/:productCode
 * @desc    Check product status in MRA system
 * @param   productCode - Product code/SKU
 * @query   terminalId: string, environment: 'SANDBOX' | 'PRODUCTION'
 * @access  Protected
 */
router.get('/product-status/:productCode', asyncHandler(MraController.checkProductStatus));

export default router;
