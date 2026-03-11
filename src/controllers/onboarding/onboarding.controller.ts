/**
 * Onboarding Controller
 * Handles terminal onboarding and activation HTTP requests
 * Refactored with centralized validation and error handling
 */

import { Request, Response } from "express";
import { BaseController } from "../base.controller";
import { TerminalService } from "../../services/terminal.service";
import { OnboardingService } from "../../services/onboarding/onboarding.service";
import {
    getErrorMessage,
    mapErrorToStatusCode
} from "../../services/onboarding/errors";
import {
    validateActivationCode,
    validateTerminalSaveData,
    isNonEmptyString,
} from "../../services/onboarding/validation";
import {
    ONBOARDING_MESSAGES,
    ONBOARDING_ERRORS,
    HTTP_STATUS
} from "../../services/onboarding/constants";

/**
 * Error handling helper for controller methods
 */
function handleError(res: Response, error: unknown, context: string): void {
    console.error(`Error ${context}:`, error);

    const statusCode = mapErrorToStatusCode(error);
    const message = getErrorMessage(error);

    BaseController.sendResponse(res, statusCode, false, message, undefined, message);
}

/**
 * Format save result message with created/skipped entities
 */
function formatSaveResultMessage(saveResult: Record<string, { saved: boolean; exists: boolean }>): string {
    const savedEntities: string[] = [];
    const skippedEntities: string[] = [];

    const entityNames: Record<string, string> = {
        tenant: 'tenant',
        subscriptionPlan: 'subscription plan',
        branchSubscription: 'branch subscription',
        branch: 'branch',
        terminal: 'terminal',
    };

    for (const [key, result] of Object.entries(saveResult)) {
        const displayName = entityNames[key] || key;
        if (result.saved) {
            savedEntities.push(displayName);
        } else if (result.exists) {
            skippedEntities.push(displayName);
        }
    }

    let message = ONBOARDING_MESSAGES.TERMINAL_DETAILS_SAVED;
    if (savedEntities.length > 0) {
        message += ` Created: ${savedEntities.join(', ')}.`;
    }
    if (skippedEntities.length > 0) {
        message += ` Skipped (already exists): ${skippedEntities.join(', ')}.`;
    }

    return message;
}

/**
 * @class   OnboardingController
 * @desc    Handles terminal onboarding and activation HTTP requests
 */
export class OnboardingController {
    /**
     * Activate a terminal using an activation code
     * @route POST /api/v1/onboarding/terminal/activate
     */
    static async activateTerminal(req: Request, res: Response): Promise<void> {
        try {
            const activationCode = validateActivationCode(req.body.activationCode);
            const activationResult = await TerminalService.activateTerminal(activationCode);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.TERMINAL_ACTIVATED, activationResult);
        } catch (error) {
            handleError(res, error, 'activating terminal');
        }
    }

    /**
     * Set terminal activation status to ACTIVATED
     * @route POST /api/v1/onboarding/terminal/set-activated
     */
    static async setTerminalActivated(req: Request, res: Response): Promise<void> {
        try {
            const { terminalId } = req.body;

            if (!isNonEmptyString(terminalId)) {
                BaseController.sendResponse(res, HTTP_STATUS.BAD_REQUEST, false, ONBOARDING_ERRORS.MISSING_TERMINAL_ID);
                return;
            }

            const terminal = await TerminalService.setActivated(terminalId);

            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.TERMINAL_ACTIVATED, terminal);
        } catch (error) {
            handleError(res, error, 'setting terminal as activated');
        }
    }

    /**
     * Save terminal details after user verification
     * Uses "exists skip" pattern - if record exists, skip creation
     * @route POST /api/v1/onboarding/terminal/save
     */
    static async saveTerminalDetails(req: Request, res: Response): Promise<void> {
        try {
            const terminalData = validateTerminalSaveData(req.body);
            const saveResult = await OnboardingService.saveTerminalDetails(terminalData as any);
            const message = formatSaveResultMessage(saveResult as unknown as Record<string, { saved: boolean; exists: boolean }>);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, message, saveResult);
        } catch (error) {
            handleError(res, error, 'saving terminal details');
        }
    }
}

export { OnboardingDataController } from './onboarding-data.controller';
