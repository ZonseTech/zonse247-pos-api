import { Request, Response, Router } from 'express';
import { PrinterController } from '../controllers/printer.controller';

const router: Router = Router();

router.get('/', function (req: Request, res: Response): void {
    res.send('Printer endpoints');
});

// Printer discovery & scanning
router.get('/discover', PrinterController.discoverPrinters);
router.get('/discover/scan-network', PrinterController.scanNetworkRange);
router.get('/discover/serial-ports', PrinterController.getSerialPorts);
router.get('/discover/common-ports', PrinterController.getCommonPorts);
router.post('/discover/validate', PrinterController.validatePrinterConfig);

// Printer health monitoring
router.get('/health/branch', PrinterController.getBranchPrinterHealth);
router.get('/health/tenant', PrinterController.monitorPrinterHealth);

// Printer management
router.get('/all', PrinterController.getAllPrinters);
router.get('/default', PrinterController.getDefaultPrinter);
router.get('/terminal/:terminalId', PrinterController.getPrintersByTerminal);
router.get('/:id', PrinterController.getPrinter);
router.post('/create', PrinterController.createPrinter);
router.put('/update/:id', PrinterController.updatePrinter);
router.put('/default/:id', PrinterController.setDefaultPrinter);
router.put('/status/:id', PrinterController.updatePrinterStatus);
router.put('/configuration/:id', PrinterController.updatePrinterConfiguration);
router.delete('/:id', PrinterController.deletePrinter);

// Printer testing
router.post('/test/:id', PrinterController.testPrinter);
router.post('/test-page/:id', PrinterController.printTestPage);

// Print operations
router.post('/print/receipt', PrinterController.printReceipt);
router.post('/print/label', PrinterController.printLabel);

// Print job management
router.get('/jobs/pending', PrinterController.getPendingPrintJobs);
router.get('/jobs/:id/history', PrinterController.getPrintJobHistory);
router.post('/jobs/:jobId/cancel', PrinterController.cancelPrintJob);
router.delete('/jobs/cleanup', PrinterController.cleanupPrintJobs);

export default router;
