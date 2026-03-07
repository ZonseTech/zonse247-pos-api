import { Request, Response } from "express";
import { BaseController } from "../base.controller";
import { TerminalService } from "../../services/terminal.service";
import { OnboardingService } from "../../services/onboarding/onboarding.service";
import { OnboardingProgressService } from "../../services/onboarding/onboarding-progress.service";
import type { OnboardingStepType, OnboardingStepStatus } from 'on-boarding';

/**
 * @class   OnboardingController
 * @desc    Handles terminal onboarding and activation HTTP requests
 * @extends BaseController
 */
export class OnboardingController {
    /**
     * @method  activateTerminal
     * @desc    Activate a terminal using an activation code
     * @param   req - Express request object with activationCode in body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with terminal, tenant, branch, and subscription data
     * @throws  400 - Missing activation code
     * @throws  400 - Invalid activation code
     * @throws  404 - Terminal not found
     * @throws  409 - Terminal already activated
     * @throws  403 - Terminal is blocked
     * @throws  402 - No active subscription
     * @throws  500 - Internal server error
     */
    static async activateTerminal(req: Request, res: Response): Promise<void> {
        try {
            const { activationCode } = req.body;

            if (!activationCode) {
                BaseController.sendResponse(res, 400, false, 'Activation code is required');
                return;
            }

            const activationResult = await TerminalService.activateTerminal(activationCode);

            BaseController.sendResponse(res, 200, true, 'Terminal activated successfully', activationResult);
        } catch (error: any) {
            console.error('Error activating terminal:', error);

            let statusCode = 500;
            const message = error.message || 'Internal server error';

            if (message.includes('Invalid activation code')) {
                statusCode = 400;
            } else if (message.includes('Terminal not found')) {
                statusCode = 404;
            } else if (message.includes('already activated')) {
                statusCode = 409;
            } else if (message.includes('blocked')) {
                statusCode = 403;
            } else if (message.includes('No active subscription')) {
                statusCode = 402;
            }

            BaseController.sendResponse(res, statusCode, false, message, undefined, message);
        }
    }

    /**
     * @method  setTerminalActivated
     * @desc    Set terminal activation status to ACTIVATED
     * @param   req - Express request with terminalId in body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with updated terminal
     */
    static async setTerminalActivated(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId } = req.body;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'terminalId is required');
                return;
            }

            const terminal = await TerminalService.setActivated(terminalId);

            BaseController.sendResponse(res, 200, true, 'Terminal activated successfully', terminal);
        } catch (error: any) {
            console.error('Error setting terminal as activated:', error);

            let statusCode = 500;
            const message = error.message || 'Internal server error';

            if (message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, message);
        }
    }

    /**
     * @method  saveTerminalDetails
     * @desc    Save terminal details after user verification
     *          Saves tenant, branch, subscription plan, branch subscription, and terminal
     *          Uses "exists skip" pattern - if record exists, skip creation
     * @param   req - Express request object with terminal activation data in body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with save results for each entity
     * @throws  400 - Missing terminal data
     * @throws  400 - Missing required fields (terminalId, tenantId, branchId)
     * @throws  500 - Internal server error
     */
    static async saveTerminalDetails(req: Request, res: Response): Promise<void> {
        try {
            const terminalData = req.body;

            if (!terminalData) {
                BaseController.sendResponse(res, 400, false, 'Terminal data is required');
                return;
            }

            if (!terminalData.terminalId) {
                BaseController.sendResponse(res, 400, false, 'terminalId is required');
                return;
            }

            if (!terminalData.tenantId) {
                BaseController.sendResponse(res, 400, false, 'tenantId is required');
                return;
            }

            if (!terminalData.branchId) {
                BaseController.sendResponse(res, 400, false, 'branchId is required');
                return;
            }

            if (!terminalData.tenant) {
                BaseController.sendResponse(res, 400, false, 'tenant data is required');
                return;
            }

            if (!terminalData.branch) {
                BaseController.sendResponse(res, 400, false, 'branch data is required');
                return;
            }

            const saveResult = await OnboardingService.saveTerminalDetails(terminalData);

            const savedEntities: string[] = [];
            const skippedEntities: string[] = [];

            if (saveResult.tenant.saved) savedEntities.push('tenant');
            else if (saveResult.tenant.exists) skippedEntities.push('tenant');

            if (saveResult.subscriptionPlan.saved) savedEntities.push('subscription plan');
            else if (saveResult.subscriptionPlan.exists) skippedEntities.push('subscription plan');

            if (saveResult.branchSubscription.saved) savedEntities.push('branch subscription');
            else if (saveResult.branchSubscription.exists) skippedEntities.push('branch subscription');

            if (saveResult.branch.saved) savedEntities.push('branch');
            else if (saveResult.branch.exists) skippedEntities.push('branch');

            if (saveResult.terminal.saved) savedEntities.push('terminal');
            else if (saveResult.terminal.exists) skippedEntities.push('terminal');

            let message = 'Terminal details saved successfully.';
            if (savedEntities.length > 0) {
                message += ` Created: ${savedEntities.join(', ')}.`;
            }
            if (skippedEntities.length > 0) {
                message += ` Skipped (already exists): ${skippedEntities.join(', ')}.`;
            }

            BaseController.sendResponse(res, 200, true, message, saveResult);
        } catch (error: any) {
            console.error('Error saving terminal details:', error);

            const message = error.message || 'Internal server error';
            BaseController.sendResponse(res, 500, false, message, undefined, message);
        }
    }

    // ========================================
    // ONBOARDING PROGRESS TRACKING METHODS
    // ========================================

    /**
     * @method  initializeProgress
     * @desc    Initialize onboarding progress for a terminal
     * @param   req - Express request with terminalId in body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with progress data
     */
    static async initializeProgress(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId, tenantId, branchId } = req.body;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'terminalId is required');
                return;
            }

            const progress = await OnboardingProgressService.initializeProgress({
                terminalId,
                tenantId,
                branchId
            });

            BaseController.sendResponse(res, 200, true, 'Onboarding progress initialized', progress);
        } catch (error: any) {
            console.error('Error initializing progress:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  getProgress
     * @desc    Get onboarding progress for a terminal
     * @param   req - Express request with terminalId in params
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with progress data
     */
    static async getProgress(req: Request, res: Response): Promise<void> {
        try {
            const terminalId = req.params.terminalId as string;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'terminalId is required');
                return;
            }

            const progress = await OnboardingProgressService.getProgress(terminalId);

            if (!progress) {
                BaseController.sendResponse(res, 404, false, 'Onboarding progress not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Onboarding progress retrieved', progress);
        } catch (error: any) {
            console.error('Error getting progress:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  updateStepStatus
     * @desc    Update status of an onboarding step
     * @param   req - Express request with terminalId, stepType, status in body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with updated progress
     */
    static async updateStepStatus(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId, stepType, status, errorMessage, metadata } = req.body;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'terminalId is required');
                return;
            }

            if (!stepType) {
                BaseController.sendResponse(res, 400, false, 'stepType is required');
                return;
            }

            if (!status) {
                BaseController.sendResponse(res, 400, false, 'status is required');
                return;
            }

            // Validate stepType
            const validStepTypes: OnboardingStepType[] = [
                'TERMINAL_ACTIVATION', 'TERMINAL_DETAILS_SAVE', 'MRA_SETUP',
                'CUSTOMERS_SYNC', 'CATEGORIES_SYNC', 'SUBSCRIPTION_PLANS_SYNC',
                'PAYMENT_METHODS_SYNC', 'PAYMENT_PROVIDERS_SYNC', 'PRODUCTS_SYNC',
                'INVENTORY_SYNC', 'USERS_SYNC', 'SETTINGS_SYNC'
            ];

            if (!validStepTypes.includes(stepType)) {
                BaseController.sendResponse(res, 400, false, `Invalid stepType. Valid values: ${validStepTypes.join(', ')}`);
                return;
            }

            // Validate status
            const validStatuses: OnboardingStepStatus[] = [
                'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'
            ];

            if (!validStatuses.includes(status)) {
                BaseController.sendResponse(res, 400, false, `Invalid status. Valid values: ${validStatuses.join(', ')}`);
                return;
            }

            const progress = await OnboardingProgressService.updateStep({
                terminalId,
                stepType,
                status,
                errorMessage,
                metadata
            });

            BaseController.sendResponse(res, 200, true, 'Step status updated', progress);
        } catch (error: any) {
            console.error('Error updating step status:', error);

            const statusCode = error.message?.includes('not found') ? 404 : 500;
            BaseController.sendResponse(res, statusCode, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  startStep
     * @desc    Mark a step as in progress
     * @param   req - Express request with terminalId, stepType in body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with updated progress
     */
    static async startStep(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId, stepType } = req.body;

            if (!terminalId || !stepType) {
                BaseController.sendResponse(res, 400, false, 'terminalId and stepType are required');
                return;
            }

            const progress = await OnboardingProgressService.startStep(terminalId, stepType);

            BaseController.sendResponse(res, 200, true, 'Step started', progress);
        } catch (error: any) {
            console.error('Error starting step:', error);
            const statusCode = error.message?.includes('not found') ? 404 : 500;
            BaseController.sendResponse(res, statusCode, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  completeStep
     * @desc    Mark a step as completed
     * @param   req - Express request with terminalId, stepType in body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with updated progress
     */
    static async completeStep(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId, stepType, metadata } = req.body;

            if (!terminalId || !stepType) {
                BaseController.sendResponse(res, 400, false, 'terminalId and stepType are required');
                return;
            }

            const progress = await OnboardingProgressService.completeStep(terminalId, stepType, metadata);

            BaseController.sendResponse(res, 200, true, 'Step completed', progress);
        } catch (error: any) {
            console.error('Error completing step:', error);
            const statusCode = error.message?.includes('not found') ? 404 : 500;
            BaseController.sendResponse(res, statusCode, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  failStep
     * @desc    Mark a step as failed
     * @param   req - Express request with terminalId, stepType, errorMessage in body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with updated progress
     */
    static async failStep(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId, stepType, errorMessage } = req.body;

            if (!terminalId || !stepType) {
                BaseController.sendResponse(res, 400, false, 'terminalId and stepType are required');
                return;
            }

            const progress = await OnboardingProgressService.failStep(
                terminalId,
                stepType,
                errorMessage || 'Step failed'
            );

            BaseController.sendResponse(res, 200, true, 'Step marked as failed', progress);
        } catch (error: any) {
            console.error('Error failing step:', error);
            const statusCode = error.message?.includes('not found') ? 404 : 500;
            BaseController.sendResponse(res, statusCode, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  skipStep
     * @desc    Mark a step as skipped
     * @param   req - Express request with terminalId, stepType in body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with updated progress
     */
    static async skipStep(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId, stepType, reason } = req.body;

            if (!terminalId || !stepType) {
                BaseController.sendResponse(res, 400, false, 'terminalId and stepType are required');
                return;
            }

            const progress = await OnboardingProgressService.skipStep(terminalId, stepType, reason);

            BaseController.sendResponse(res, 200, true, 'Step skipped', progress);
        } catch (error: any) {
            console.error('Error skipping step:', error);
            const statusCode = error.message?.includes('not found') ? 404 : 500;
            BaseController.sendResponse(res, statusCode, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  resetProgress
     * @desc    Reset onboarding progress to initial state
     * @param   req - Express request with terminalId in params
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with reset progress
     */
    static async resetProgress(req: Request, res: Response): Promise<void> {
        try {
            const terminalId = req.params.terminalId as string;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'terminalId is required');
                return;
            }

            const progress = await OnboardingProgressService.resetProgress(terminalId);

            BaseController.sendResponse(res, 200, true, 'Onboarding progress reset', progress);
        } catch (error: any) {
            console.error('Error resetting progress:', error);
            const statusCode = error.message?.includes('not found') ? 404 : 500;
            BaseController.sendResponse(res, statusCode, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  deleteProgress
     * @desc    Delete onboarding progress
     * @param   req - Express request with terminalId in params
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with success status
     */
    static async deleteProgress(req: Request, res: Response): Promise<void> {
        try {
            const terminalId = req.params.terminalId as string;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'terminalId is required');
                return;
            }

            await OnboardingProgressService.deleteProgress(terminalId);

            BaseController.sendResponse(res, 200, true, 'Onboarding progress deleted');
        } catch (error: any) {
            console.error('Error deleting progress:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  getNextStep
     * @desc    Get the next step to complete in onboarding
     * @param   req - Express request with terminalId in params
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with next step or null if complete
     */
    static async getNextStep(req: Request, res: Response): Promise<void> {
        try {
            const terminalId = req.params.terminalId as string;

            if (!terminalId) {
                BaseController.sendResponse(res, 400, false, 'terminalId is required');
                return;
            }

            const nextStep = await OnboardingProgressService.getNextStep(terminalId);

            if (nextStep === null) {
                BaseController.sendResponse(res, 200, true, 'Onboarding complete', { nextStep: null, isComplete: true });
            } else {
                BaseController.sendResponse(res, 200, true, 'Next step retrieved', { nextStep, isComplete: false });
            }
        } catch (error: any) {
            console.error('Error getting next step:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }
}

// Re-export the data controller for convenience
export { OnboardingDataController } from './onboarding-data.controller';
