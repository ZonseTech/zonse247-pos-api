/**
 * Printer CRUD Controller
 * Handles create, read, update, delete operations for printers
 */

import { Response } from 'express';
import { BaseController } from '../base.controller';
import { PrinterService } from '../../services/printer/printer.service';
import {
    AuthenticatedRequest,
    detectPlatform,
    handleError
} from './printer.helpers';
import {
    CreatePrinterRequest,
    UpdatePrinterRequest,
    PrinterConfiguration,
    PrinterStatus
} from '../../types/printer';
import {
    PrinterResponseDTO,
} from '../../types/printer.platform';
import { PrinterNotFoundError } from '../../utils/errors/printer.error';
import { parsePaginationParams } from '../../utils/pagination.utils';
import { AuditService, getAuditContext } from '../../services/audit.service';

/**
 * PrinterCrudController - CRUD operations for printers
 */
export class PrinterCrudController extends BaseController {
    /**
     * Create a new printer
     * POST /printers/create
     */
    static async createPrinter(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const data = req.body as CreatePrinterRequest;
            const printer = await PrinterService.createPrinter(
                data,
                req.auth.tenantId,
                req.auth.branchId
            );

            const response: PrinterResponseDTO = {
                success: true,
                message: 'Printer created successfully',
                data: { printer },
                meta: {
                    platform: detectPlatform(req),
                    timestamp: new Date().toISOString()
                }
            };

            BaseController.sendCreated(res, response.message, response.data);

            AuditService.logCreate(getAuditContext(req), 'Printer', (printer as any).printerId || '', (data as any).name || '', { type: (data as any).type, connectionType: (data as any).connectionType });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Get all printers
     * GET /printers/all
     */
    static async getAllPrinters(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const pagination = parsePaginationParams(req.query as Record<string, any>);
            const result = await PrinterService.listPrinters(
                req.query as Record<string, any>,
                req.auth.tenantId,
                req.auth.branchId,
                pagination,
            );

            BaseController.sendPaginated(res, 'Printers retrieved successfully', result.data, result.pagination, 'printers');
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Get printer by ID
     * GET /printers/:id
     */
    static async getPrinter(req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> {
        try {
            const printer = await PrinterService.getPrinterById(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId
            );

            if (!printer) {
                throw new PrinterNotFoundError(req.params.id);
            }

            BaseController.sendSuccess(res, 'Printer retrieved successfully', { printer });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Get default printer
     * GET /printers/default
     */
    static async getDefaultPrinter(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const printerUse = req.query.use as 'receipt' | 'label' | 'kitchen' | 'report' | undefined;
            const printer = await PrinterService.getDefaultPrinter(req.auth.branchId, printerUse);

            if (!printer) {
                BaseController.sendResponse(res, 404, false, 'No default printer found');
                return;
            }

            BaseController.sendSuccess(res, 'Default printer retrieved successfully', { printer });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Get printers by terminal
     * GET /printers/terminal/:terminalId
     */
    static async getPrintersByTerminal(req: AuthenticatedRequest<{ terminalId: string }>, res: Response): Promise<void> {
        try {
            const printers = await PrinterService.getPrintersByTerminal(req.params.terminalId);
            BaseController.sendSuccess(res, 'Printers retrieved successfully', {
                printers,
                count: printers.length
            });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Update a printer
     * PUT /printers/update/:id
     */
    static async updatePrinter(req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> {
        try {
            const printer = await PrinterService.updatePrinter(
                req.params.id,
                req.body as UpdatePrinterRequest,
                req.auth.tenantId,
                req.auth.branchId
            );

            if (!printer) {
                throw new PrinterNotFoundError(req.params.id);
            }

            AuditService.logUpdate(getAuditContext(req), 'Printer', req.params.id, (printer as any).name || req.params.id, undefined, req.body as any);

            BaseController.sendSuccess(res, 'Printer updated successfully', { printer });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Set printer as default
     * PUT /printers/default/:id
     */
    static async setDefaultPrinter(req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> {
        try {
            const printer = await PrinterService.setDefaultPrinter(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId
            );

            if (!printer) {
                throw new PrinterNotFoundError(req.params.id);
            }

            BaseController.sendSuccess(res, 'Printer set as default successfully', { printer });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Update printer status
     * PUT /printers/status/:id
     */
    static async updatePrinterStatus(req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> {
        try {
            const { status, errorMessage } = req.body as { status: PrinterStatus; errorMessage?: string };

            const printer = await PrinterService.updatePrinterStatus(
                req.params.id,
                status,
                req.auth.tenantId,
                req.auth.branchId,
                errorMessage
            );

            if (!printer) {
                throw new PrinterNotFoundError(req.params.id);
            }

            BaseController.sendSuccess(res, 'Printer status updated successfully', { printer });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Update printer configuration
     * PUT /printers/configuration/:id
     */
    static async updatePrinterConfiguration(req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> {
        try {
            const configuration = req.body as Partial<PrinterConfiguration>;

            const printer = await PrinterService.updatePrinterConfiguration(
                req.params.id,
                configuration,
                req.auth.tenantId,
                req.auth.branchId
            );

            if (!printer) {
                throw new PrinterNotFoundError(req.params.id);
            }

            BaseController.sendSuccess(res, 'Printer configuration updated successfully', { printer });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Delete a printer
     * DELETE /printers/:id
     */
    static async deletePrinter(req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> {
        try {
            const deleted = await PrinterService.deletePrinter(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId
            );

            if (!deleted) {
                throw new PrinterNotFoundError(req.params.id);
            }

            AuditService.logDelete(getAuditContext(req), 'Printer', req.params.id, req.params.id);

            BaseController.sendSuccess(res, 'Printer deleted successfully', { deleted: true });
        } catch (error) {
            handleError(res, error);
        }
    }
}

export default PrinterCrudController;
