/**
 * Printer Discovery Controller
 * Handles printer discovery, testing, and health monitoring
 */

import { Response } from 'express';
import { BaseController } from '../base.controller';
import { PrinterService } from '../../services/printer/printer.service';
import { PrinterDiscoveryService } from '../../services/printer/printer-discovery.service';
import { getPrintAgent } from '../../services/printer/print-agent.service';
import {
    AuthenticatedRequest,
    detectPlatform,
    handleError
} from './printer.helpers';
import { PrinterConnectionType, PrinterStatus } from '../../types/printer';
import { PrinterHealthResponseDTO } from '../../types/printer.platform';

/**
 * PrinterDiscoveryController - Discovery and testing operations
 */
export class PrinterDiscoveryController extends BaseController {
    /**
     * Test printer connection
     * POST /printers/test/:id
     */
    static async testPrinter(req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> {
        try {
            const result = await PrinterService.testPrinter(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId
            );

            const statusCode = result.success ? 200 : 503;
            BaseController.sendResponse(res, statusCode, result.success, result.message, {
                ...result,
                platform: detectPlatform(req)
            });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Discover available printers
     * GET /printers/discover
     */
    static async discoverPrinters(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const connectionType = req.query.connectionType as PrinterConnectionType | undefined;
            const platform = detectPlatform(req);
            const printers = await PrinterService.discoverPrinters(connectionType);

            BaseController.sendSuccess(res, 'Printer discovery completed', {
                count: printers.length,
                printers,
                platform,
                discoveredAt: new Date().toISOString()
            });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Scan network range for printers
     * POST /printers/discover/scan-network
     */
    static async scanNetworkRange(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { baseIP, startHost, endHost, port } = req.query;

            if (!baseIP) {
                BaseController.sendResponse(res, 400, false, 'baseIP is required (e.g., 192.168.1.0)');
                return;
            }

            const printers = await PrinterDiscoveryService.scanNetworkRange(
                baseIP as string,
                startHost ? parseInt(startHost as string) : 1,
                endHost ? parseInt(endHost as string) : 254,
                port ? parseInt(port as string) : 9100
            );

            BaseController.sendSuccess(res, 'Network scan completed', {
                baseIP,
                scannedRange: `${startHost || 1}-${endHost || 254}`,
                port: port || 9100,
                count: printers.length,
                printers,
                scannedAt: new Date().toISOString()
            });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Get available serial ports
     * GET /printers/discover/serial-ports
     */
    static async getSerialPorts(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const ports = await PrinterDiscoveryService.getAvailableSerialPorts();
            BaseController.sendSuccess(res, 'Serial ports retrieved', {
                count: ports.length,
                ports,
                platform: detectPlatform(req)
            });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Get common printer ports info
     * GET /printers/discover/common-ports
     */
    static async getCommonPorts(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const ports = PrinterDiscoveryService.getCommonPrinterPorts();
            BaseController.sendSuccess(res, 'Common printer ports retrieved', ports);
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Validate printer configuration
     * POST /printers/discover/validate
     */
    static async validatePrinterConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validation = PrinterDiscoveryService.validatePrinterConfig(req.body);

            if (validation.valid) {
                BaseController.sendSuccess(res, 'Printer configuration is valid', validation);
            } else {
                BaseController.sendResponse(res, 400, false, 'Invalid printer configuration', validation);
            }
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Register a discovered printer
     * POST /printers/discover/register
     */
    static async registerDiscoveredPrinter(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const agent = getPrintAgent();
            const printer = await agent.registerPrinter(req.body.discoveredPrinter, {
                printerName: req.body.printerName,
                tenantId: req.auth?.tenantId,
                branchId: req.auth?.activeBranchId || req.auth?.branchId,
                isDefault: req.body.isDefault,
                isReceiptPrinter: req.body.isReceiptPrinter,
                isLabelPrinter: req.body.isLabelPrinter,
                isKitchenPrinter: req.body.isKitchenPrinter
            });

            BaseController.sendCreated(res, 'Printer registered successfully', { printer });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Get printer health for branch
     * GET /printers/health/branch
     */
    static async getBranchPrinterHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const results = await PrinterDiscoveryService.getBranchPrinterStatus(req.auth.branchId);

            const summary = {
                total: results.length,
                online: results.filter(r => r.printerStatus === 'ONLINE').length,
                offline: results.filter(r => r.printerStatus === 'OFFLINE').length,
                error: results.filter(r => r.printerStatus === 'ERROR').length
            };

            const response: PrinterHealthResponseDTO = {
                success: true,
                message: 'Branch printer health retrieved',
                data: {
                    summary,
                    printers: results.map(r => ({
                        printerId: r.printerId,
                        printerName: r.printerId,
                        status: r.printerStatus as PrinterStatus,
                        lastChecked: new Date(),
                        responseTime: r.responseTime,
                        errorMessage: r.errorDetails
                    }))
                }
            };

            BaseController.sendSuccess(res, response.message, response.data);
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Monitor tenant printer health
     * GET /printers/health/tenant
     */
    static async monitorPrinterHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const health = await PrinterDiscoveryService.monitorPrinterHealth(req.auth.tenantId);
            BaseController.sendSuccess(res, 'Printer health monitoring completed', {
                ...health,
                checkedAt: new Date().toISOString()
            });
        } catch (error) {
            handleError(res, error);
        }
    }
}

export default PrinterDiscoveryController;
