import { Router } from 'express';
import { PrinterController } from '../controllers/printer';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { printerValidationSchemas } from '../validations/printer.schemas';

const router: Router = Router();

/**
 * POST /agent/start
 * Start the print agent (Desktop/Electron only)
 * Initializes background print job processing
 */
router.post('/agent/start', PrinterController.startPrintAgent);

/**
 * POST /agent/stop
 * Stop the print agent
 * Halts background print job processing
 */
router.post('/agent/stop', PrinterController.stopPrintAgent);

/**
 * GET /agent/status
 * Get current print agent status
 * @returns {boolean} isRunning - Whether agent is active
 * @returns {string} platform - Current platform (DESKTOP, WEB, etc.)
 */
router.get('/agent/status', PrinterController.getPrintAgentStatus);

/**
 * GET /agent/permissions
 * Check system permissions for printing
 * @returns {object} permissions - USB, Bluetooth, Network access status
 */
router.get('/agent/permissions', PrinterController.checkPermissions);

/**
 * GET /agent/setup-instructions
 * Get platform-specific printer setup instructions
 * @returns {object} instructions - Setup guide for current platform
 */
router.get('/agent/setup-instructions', PrinterController.getSetupInstructions);

/**
 * GET /queue/status
 * Get print queue status and statistics
 * @returns {number} total - Total jobs in queue
 * @returns {number} pending - Pending jobs
 * @returns {number} retrying - Jobs being retried
 */
router.get('/queue/status', PrinterController.getQueueStatus);

/**
 * POST /queue/retry-all
 * Retry all failed/pending print jobs in the queue
 */
router.post('/queue/retry-all', PrinterController.retryAllQueuedJobs);

/**
 * DELETE /queue/clear
 * Clear all jobs from the print queue
 */
router.delete('/queue/clear', PrinterController.clearPrintQueue);

/**
 * GET /discover
 * Discover available printers on the network/system
 * @query {string} [connectionType] - Filter by: USB, NETWORK, BLUETOOTH, SERIAL, WIFI
 * @returns {array} printers - List of discovered printers
 */
router.get('/discover', PrinterController.discoverPrinters);

/**
 * POST /discover/scan-network
 * Scan a network IP range for printers
 * @query {string} baseIP - Base IP address (e.g., 192.168.1.0)
 * @query {number} [startHost=1] - Start of IP range
 * @query {number} [endHost=254] - End of IP range
 * @query {number} [port=9100] - Printer port to scan
 * @returns {array} printers - Found network printers
 */
router.post(
    '/discover/scan-network',
    validateQuery(printerValidationSchemas.scanNetwork),
    PrinterController.scanNetworkRange
);

/**
 * GET /discover/serial-ports
 * Get available serial/COM ports on the system
 * @returns {array} ports - Available serial ports
 */
router.get('/discover/serial-ports', PrinterController.getSerialPorts);

/**
 * GET /discover/common-ports
 * Get information about common printer ports
 * @returns {object} ports - Common port numbers and protocols
 */
router.get('/discover/common-ports', PrinterController.getCommonPorts);

/**
 * POST /discover/validate
 * Validate a printer configuration before saving
 * @body {object} printerConfig - Printer configuration to validate
 * @returns {boolean} valid - Whether configuration is valid
 * @returns {array} errors - Validation errors if any
 */
router.post(
    '/discover/validate',
    validateBody(printerValidationSchemas.createPrinter),
    PrinterController.validatePrinterConfig
);

/**
 * POST /discover/register
 * Register a discovered printer to the system
 * @body {object} discoveredPrinter - Discovered printer details
 * @body {string} printerName - Name for the printer
 * @body {boolean} [isDefault] - Set as default printer
 * @body {boolean} [isReceiptPrinter] - Use for receipts
 * @body {boolean} [isLabelPrinter] - Use for labels
 * @body {boolean} [isKitchenPrinter] - Use for kitchen orders
 * @returns {object} printer - Registered printer
 */
router.post(
    '/discover/register',
    validateBody(printerValidationSchemas.registerDiscoveredPrinter),
    PrinterController.registerDiscoveredPrinter
);

/**
 * GET /health/branch
 * Get health status of all printers in current branch
 * @returns {object} summary - Online/offline/error counts
 * @returns {array} printers - Individual printer status
 */
router.get('/health/branch', PrinterController.getBranchPrinterHealth);

/**
 * GET /health/tenant
 * Monitor health of all printers across tenant
 * @returns {object} health - Tenant-wide printer health metrics
 */
router.get('/health/tenant', PrinterController.monitorPrinterHealth);

/**
 * GET /all
 * Get all printers for the current branch
 * @query {string} [search] - Search by printer name
 * @query {string} [connectionType] - Filter by connection type
 * @query {string} [status] - Filter by status: ONLINE, OFFLINE, ERROR
 * @query {boolean} [isDefault] - Filter default printers only
 * @returns {array} printers - List of printers
 * @returns {number} count - Total count
 */
router.get(
    '/all',
    validateQuery(printerValidationSchemas.queryParams),
    PrinterController.getAllPrinters
);

/**
 * GET /default
 * Get the default printer for the branch
 * @query {string} [use] - Printer use: receipt, label, kitchen, report
 * @returns {object} printer - Default printer or null
 */
router.get('/default', PrinterController.getDefaultPrinter);

/**
 * GET /terminal/:terminalId
 * Get printers assigned to a specific terminal
 * @param {string} terminalId - Terminal UUID
 * @returns {array} printers - Printers for the terminal
 */
router.get(
    '/terminal/:terminalId',
    validateParams(printerValidationSchemas.idParam.keys({ terminalId: printerValidationSchemas.idParam.extract('id') })),
    PrinterController.getPrintersByTerminal
);

/**
 * GET /:id
 * Get a single printer by ID
 * @param {string} id - Printer UUID
 * @returns {object} printer - Printer details
 */
router.get(
    '/:id',
    validateParams(printerValidationSchemas.idParam),
    PrinterController.getPrinter
);

/**
 * POST /create
 * Create a new printer
 * @body {string} printerName - Printer display name
 * @body {string} connectionType - USB, NETWORK, BLUETOOTH, SERIAL, WIFI
 * @body {string} [connectionAddress] - IP address or device path
 * @body {number} [port] - Port number for network printers
 * @body {object} [configuration] - Printer configuration settings
 * @body {boolean} [isDefault] - Set as default printer
 * @returns {object} printer - Created printer
 */
router.post(
    '/create',
    validateBody(printerValidationSchemas.createPrinter),
    PrinterController.createPrinter
);

/**
 * PUT /update/:id
 * Update an existing printer
 * @param {string} id - Printer UUID
 * @body {string} [printerName] - Updated name
 * @body {string} [connectionAddress] - Updated address
 * @body {object} [configuration] - Updated configuration
 * @returns {object} printer - Updated printer
 */
router.put(
    '/update/:id',
    validateParams(printerValidationSchemas.idParam),
    validateBody(printerValidationSchemas.updatePrinter),
    PrinterController.updatePrinter
);

/**
 * PUT /default/:id
 * Set a printer as the default
 * @param {string} id - Printer UUID to set as default
 * @returns {object} printer - Updated default printer
 */
router.put(
    '/default/:id',
    validateParams(printerValidationSchemas.idParam),
    PrinterController.setDefaultPrinter
);

/**
 * PUT /status/:id
 * Update printer status manually
 * @param {string} id - Printer UUID
 * @body {string} status - New status: ONLINE, OFFLINE, ERROR, BUSY
 * @body {string} [errorMessage] - Error description if status is ERROR
 * @returns {object} printer - Updated printer
 */
router.put(
    '/status/:id',
    validateParams(printerValidationSchemas.idParam),
    validateBody(printerValidationSchemas.updateStatus),
    PrinterController.updatePrinterStatus
);

/**
 * PUT /configuration/:id
 * Update printer configuration settings
 * @param {string} id - Printer UUID
 * @body {number} [paperWidth] - Paper width in mm (58, 80)
 * @body {string} [characterSet] - Character encoding
 * @body {boolean} [autoCut] - Enable auto paper cut
 * @body {boolean} [openCashDrawer] - Open cash drawer after print
 * @returns {object} printer - Updated printer
 */
router.put(
    '/configuration/:id',
    validateParams(printerValidationSchemas.idParam),
    PrinterController.updatePrinterConfiguration
);

/**
 * DELETE /:id
 * Delete a printer
 * @param {string} id - Printer UUID
 * @returns {boolean} deleted - Deletion success
 */
router.delete(
    '/:id',
    validateParams(printerValidationSchemas.idParam),
    PrinterController.deletePrinter
);

/**
 * POST /test/:id
 * Test printer connection
 * @param {string} id - Printer UUID
 * @returns {boolean} success - Connection test result
 * @returns {number} responseTime - Response time in ms
 * @returns {string} [error] - Error message if failed
 */
router.post(
    '/test/:id',
    validateParams(printerValidationSchemas.idParam),
    PrinterController.testPrinter
);

/**
 * POST /test-page/:id
 * Print a test page to verify printer functionality
 * @param {string} id - Printer UUID
 * @returns {object} printJob - Created test page print job
 */
router.post(
    '/test-page/:id',
    validateParams(printerValidationSchemas.idParam),
    PrinterController.printTestPage
);

// ==================== CASH DRAWER ====================

/**
 * POST /drawer/open/:id
 * Open cash drawer connected to a printer
 * @param {string} id - Printer UUID
 * @returns {object} printJob - Drawer open command job
 */
router.post(
    '/drawer/open/:id',
    validateParams(printerValidationSchemas.idParam),
    PrinterController.openCashDrawer
);

// ==================== PRINT OPERATIONS ====================

/**
 * POST /print/receipt
 * Print a sales receipt
 * @body {string} [printerId] - Specific printer UUID (uses default if omitted)
 * @body {string} [saleId] - Sale UUID to print
 * @body {object} [receiptData] - Custom receipt data
 * @body {number} [copies=1] - Number of copies
 * @returns {object} printJob - Created print job
 * @returns {object} [sale] - Sale data if saleId provided
 */
router.post(
    '/print/receipt',
    validateBody(printerValidationSchemas.printReceipt),
    PrinterController.printReceipt
);

/**
 * POST /print/label
 * Print a product label
 * @body {string} [printerId] - Specific printer UUID
 * @body {string} productId - Product UUID
 * @body {string} [variantId] - Variant UUID
 * @body {number} [quantity=1] - Number of labels
 * @body {string} [labelSize] - Label size: small, medium, large
 * @returns {object} printJob - Created print job
 */
router.post(
    '/print/label',
    validateBody(printerValidationSchemas.printLabel),
    PrinterController.printLabel
);

/**
 * GET /jobs/pending
 * Get all pending print jobs for the branch
 * @returns {array} printJobs - Pending jobs
 * @returns {number} count - Total pending count
 */
router.get('/jobs/pending', PrinterController.getPendingPrintJobs);

/**
 * GET /jobs/:id/history
 * Get print job history for a printer
 * @param {string} id - Printer UUID
 * @returns {array} printJobs - Historical print jobs
 * @returns {number} count - Total count
 */
router.get(
    '/jobs/:id/history',
    validateParams(printerValidationSchemas.idParam),
    PrinterController.getPrintJobHistory
);

/**
 * POST /jobs/:jobId/cancel
 * Cancel a pending print job
 * @param {string} jobId - Print job UUID
 * @returns {object} printJob - Cancelled job
 */
router.post(
    '/jobs/:jobId/cancel',
    validateParams(printerValidationSchemas.idParam.keys({ jobId: printerValidationSchemas.idParam.extract('id') })),
    PrinterController.cancelPrintJob
);

/**
 * POST /jobs/:jobId/retry
 * Retry a failed print job
 * @param {string} jobId - Print job UUID
 * @returns {object} printJob - Retried job
 */
router.post(
    '/jobs/:jobId/retry',
    validateParams(printerValidationSchemas.idParam.keys({ jobId: printerValidationSchemas.idParam.extract('id') })),
    PrinterController.retryPrintJob
);

/**
 * DELETE /jobs/cleanup
 * Delete old print jobs
 * @query {number} [daysOld=30] - Delete jobs older than this many days
 * @returns {number} deletedCount - Number of jobs deleted
 */
router.delete(
    '/jobs/cleanup',
    validateQuery(printerValidationSchemas.cleanupPrintJobs),
    PrinterController.cleanupPrintJobs
);

export default router;
