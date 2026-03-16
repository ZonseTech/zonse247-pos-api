/**
 * Printer Printing Controller
 * Handles print operations (receipts, labels, test pages)
 */

import { Response } from 'express';
import { BaseController } from '../base.controller';
import { PrinterService } from '../../services/printer/printer.service';
import { SaleService } from '../../services/sale.service';
import {
    AuthenticatedRequest,
    detectPlatform,
    handleError
} from './printer.helpers';
import {
    PrintReceiptRequest,
    PrintLabelRequest
} from '../../types/printer';
import { PrintJobResponseDTO } from '../../types/printer.platform';

/**
 * Check if error is a "no printer available" error (not a system failure)
 */
function isNoPrinterError(error: unknown): boolean {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return msg.includes('no receipt printer available')
            || msg.includes('no label printer available')
            || msg.includes('no printer available');
    }
    return false;
}

/**
 * PrinterPrintingController - Print operations
 */
export class PrinterPrintingController extends BaseController {
    /**
     * Print a receipt
     * POST /printers/print/receipt
     */
    static async printReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const request = req.body as PrintReceiptRequest;
            const platform = detectPlatform(req);

            const printJob = await PrinterService.printReceipt(
                request,
                req.auth.tenantId,
                req.auth.branchId,
                req.auth.userId
            );

            // Fetch sale data if available
            let saleData = null;
            if (request.saleId) {
                saleData = await SaleService.getSaleById(
                    request.saleId,
                    req.auth.tenantId,
                    req.auth.branchId
                );
            }

            const response: PrintJobResponseDTO = {
                success: true,
                message: 'Receipt print job created',
                data: {
                    printJob,
                    sale: saleData
                },
                meta: {
                    platform,
                    timestamp: new Date().toISOString()
                }
            };

            BaseController.sendSuccess(res, response.message, response.data);
        } catch (error) {
            if (isNoPrinterError(error)) {
                BaseController.sendResponse(res, 200, false, (error as Error).message, {
                    noPrinter: true,
                    hint: 'Add and configure a printer in Settings > Printers'
                });
                return;
            }
            handleError(res, error);
        }
    }

    /**
     * Print a label
     * POST /printers/print/label
     */
    static async printLabel(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const printJob = await PrinterService.printLabel(
                req.body as PrintLabelRequest,
                req.auth.tenantId,
                req.auth.branchId,
                req.auth.userId
            );

            BaseController.sendSuccess(res, 'Label print job created', { printJob });
        } catch (error) {
            if (isNoPrinterError(error)) {
                BaseController.sendResponse(res, 200, false, (error as Error).message, {
                    noPrinter: true,
                    hint: 'Add and configure a label printer in Settings > Printers'
                });
                return;
            }
            handleError(res, error);
        }
    }

    /**
     * Print test page
     * POST /printers/test-page/:id
     */
    static async printTestPage(req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> {
        try {
            const printJob = await PrinterService.printTestPage(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId,
                req.auth.userId
            );

            BaseController.sendSuccess(res, 'Test page print job created', { printJob });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Open cash drawer
     * POST /printers/drawer/open/:id
     */
    static async openCashDrawer(req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> {
        try {
            const printJob = await PrinterService.openCashDrawer(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId,
                req.auth.userId
            );

            BaseController.sendSuccess(res, 'Cash drawer opened successfully', { printJob });
        } catch (error) {
            handleError(res, error);
        }
    }
}

export default PrinterPrintingController;
