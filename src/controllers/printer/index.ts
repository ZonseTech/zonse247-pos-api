/**
 * Printer Controllers Index
 * Exports all printer-related controllers
 */

// Initialize strategies on module load
import { ensureStrategiesInitialized } from '../../services/printer/strategies';
ensureStrategiesInitialized();

// Export individual controllers
export { PrinterCrudController } from './crud.controller';
export { PrinterDiscoveryController } from './discovery.controller';
export { PrinterPrintingController } from './printing.controller';
export { PrintJobsController } from './jobs.controller';
export { PrintAgentController } from './agent.controller';
export { PrintQueueController } from './queue.controller';

// Export helpers
export {
    AuthenticatedRequest,
    detectPlatform,
    handleError,
    createPlatformResponse
} from './printer.helpers';

// Import all for combined export
import { PrinterCrudController } from './crud.controller';
import { PrinterDiscoveryController } from './discovery.controller';
import { PrinterPrintingController } from './printing.controller';
import { PrintJobsController } from './jobs.controller';
import { PrintAgentController } from './agent.controller';
import { PrintQueueController } from './queue.controller';

/**
 * Combined PrinterController for backwards compatibility
 * Maps all methods from individual controllers
 */
export const PrinterController = {
    // CRUD Operations
    createPrinter: PrinterCrudController.createPrinter,
    getAllPrinters: PrinterCrudController.getAllPrinters,
    getPrinter: PrinterCrudController.getPrinter,
    getDefaultPrinter: PrinterCrudController.getDefaultPrinter,
    getPrintersByTerminal: PrinterCrudController.getPrintersByTerminal,
    updatePrinter: PrinterCrudController.updatePrinter,
    setDefaultPrinter: PrinterCrudController.setDefaultPrinter,
    updatePrinterStatus: PrinterCrudController.updatePrinterStatus,
    updatePrinterConfiguration: PrinterCrudController.updatePrinterConfiguration,
    deletePrinter: PrinterCrudController.deletePrinter,

    // Discovery & Testing
    testPrinter: PrinterDiscoveryController.testPrinter,
    discoverPrinters: PrinterDiscoveryController.discoverPrinters,
    scanNetworkRange: PrinterDiscoveryController.scanNetworkRange,
    getSerialPorts: PrinterDiscoveryController.getSerialPorts,
    getCommonPorts: PrinterDiscoveryController.getCommonPorts,
    validatePrinterConfig: PrinterDiscoveryController.validatePrinterConfig,
    registerDiscoveredPrinter: PrinterDiscoveryController.registerDiscoveredPrinter,
    getBranchPrinterHealth: PrinterDiscoveryController.getBranchPrinterHealth,
    monitorPrinterHealth: PrinterDiscoveryController.monitorPrinterHealth,

    // Print Operations
    printReceipt: PrinterPrintingController.printReceipt,
    printLabel: PrinterPrintingController.printLabel,
    printTestPage: PrinterPrintingController.printTestPage,
    openCashDrawer: PrinterPrintingController.openCashDrawer,

    // Job Management
    getPrintJobHistory: PrintJobsController.getPrintJobHistory,
    getPendingPrintJobs: PrintJobsController.getPendingPrintJobs,
    cancelPrintJob: PrintJobsController.cancelPrintJob,
    retryPrintJob: PrintJobsController.retryPrintJob,
    cleanupPrintJobs: PrintJobsController.cleanupPrintJobs,

    // Print Agent
    startPrintAgent: PrintAgentController.startPrintAgent,
    stopPrintAgent: PrintAgentController.stopPrintAgent,
    getPrintAgentStatus: PrintAgentController.getPrintAgentStatus,
    checkPermissions: PrintAgentController.checkPermissions,
    getSetupInstructions: PrintAgentController.getSetupInstructions,

    // Queue Operations
    getQueueStatus: PrintQueueController.getQueueStatus,
    retryAllQueuedJobs: PrintQueueController.retryAllQueuedJobs,
    clearPrintQueue: PrintQueueController.clearPrintQueue
};

export default PrinterController;
