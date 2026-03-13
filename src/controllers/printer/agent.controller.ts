/**
 * Print Agent Controller
 * Handles print agent operations (Desktop/Electron only)
 */

import { Response } from 'express';
import { BaseController } from '../base.controller';
import { getPrintAgent } from '../../services/printer/print-agent.service';
import { AuthenticatedRequest, detectPlatform, handleError } from './printer.helpers';
import { AppPlatform } from '../../types/printer.platform';

/**
 * PrintAgentController - Desktop print agent operations
 */
export class PrintAgentController extends BaseController {
    /**
     * Start the print agent
     * POST /printers/agent/start
     */
    static async startPrintAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const platform = detectPlatform(req);

            if (platform !== AppPlatform.DESKTOP) {
                BaseController.sendResponse(
                    res,
                    400,
                    false,
                    'Print agent is only available on desktop applications'
                );
                return;
            }

            const agent = getPrintAgent({
                defaultTenantId: req.auth?.tenantId || '-1',
                defaultBranchId: req.auth?.activeBranchId || req.auth?.branchId
            });

            await agent.start();
            BaseController.sendSuccess(res, 'Print agent started', agent.getStatus());
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Stop the print agent
     * POST /printers/agent/stop
     */
    static async stopPrintAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const agent = getPrintAgent();
            await agent.stop();
            BaseController.sendSuccess(res, 'Print agent stopped', { isRunning: false });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Get print agent status
     * GET /printers/agent/status
     */
    static async getPrintAgentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const agent = getPrintAgent();
            const status = agent.getStatus();

            BaseController.sendSuccess(res, 'Print agent status', {
                ...status,
                platform: detectPlatform(req)
            });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Check system permissions
     * GET /printers/agent/permissions
     */
    static async checkPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const agent = getPrintAgent();
            const permissions = await agent.checkPermissions();

            BaseController.sendSuccess(res, 'Permission check completed', {
                ...permissions,
                platform: detectPlatform(req)
            });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Get setup instructions
     * GET /printers/agent/setup-instructions
     */
    static async getSetupInstructions(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const agent = getPrintAgent();
            const instructions = agent.getSetupInstructions();

            BaseController.sendSuccess(res, 'Setup instructions', {
                ...instructions,
                platform: detectPlatform(req)
            });
        } catch (error) {
            handleError(res, error);
        }
    }
}

export default PrintAgentController;
