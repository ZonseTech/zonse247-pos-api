import { OnboardingProgressModel } from '../../models/onboarding-progress.model';
import type {
    OnboardingProgress,
    OnboardingStepType,
    InitOnboardingProgressRequest,
    UpdateOnboardingStepRequest
} from 'on-boarding';

/**
 * Default onboarding steps configuration
 * Order matters - respects dependencies between steps
 * 
 * ONBOARDING FLOW:
 * 1. TERMINAL_ACTIVATION - Validate activation code with cloud, get terminal details
 * 2. TERMINAL_DETAILS_SAVE - Save tenant, branch, subscription, terminal to local DB
 * 3. SUBSCRIPTION_PLANS_SYNC - Sync subscription plans (reference data)
 * 4. PAYMENT_METHODS_SYNC - Sync payment methods for the branch
 * 5. PAYMENT_PROVIDERS_SYNC - Sync payment service providers
 * 6. CATEGORIES_SYNC - Sync product categories
 * 7. PRODUCTS_SYNC - Sync products, variants, and barcodes
 * 8. INVENTORY_SYNC - Sync inventory levels
 * 9. CUSTOMERS_SYNC - Sync customer records
 * 10. USERS_SYNC - Sync users and permissions
 * 11. SETTINGS_SYNC - Sync terminal/branch settings
 * 12. MRA_SETUP - Configure MRA integration (optional)
 */
const ONBOARDING_STEPS_CONFIG: Array<{ stepType: OnboardingStepType; order: number; required: boolean }> = [
    { stepType: 'TERMINAL_ACTIVATION', order: 1, required: true },
    { stepType: 'TERMINAL_DETAILS_SAVE', order: 2, required: true },
    { stepType: 'SUBSCRIPTION_PLANS_SYNC', order: 3, required: false },
    { stepType: 'PAYMENT_METHODS_SYNC', order: 4, required: false },
    { stepType: 'PAYMENT_PROVIDERS_SYNC', order: 5, required: false },
    { stepType: 'CATEGORIES_SYNC', order: 6, required: false },
    { stepType: 'PRODUCTS_SYNC', order: 7, required: false },
    { stepType: 'INVENTORY_SYNC', order: 8, required: false },
    { stepType: 'CUSTOMERS_SYNC', order: 9, required: false },
    { stepType: 'USERS_SYNC', order: 10, required: false },
    { stepType: 'SETTINGS_SYNC', order: 11, required: false },
    { stepType: 'MRA_SETUP', order: 12, required: false },
];

/**
 * @class   OnboardingProgressService
 * @desc    Business logic layer for onboarding progress tracking
 */
export class OnboardingProgressService {
    /**
     * @method  initializeProgress
     * @desc    Initialize onboarding progress for a terminal
     *          Creates progress record with default steps if not exists
     * @param   request - Init request with terminal ID and optional tenant/branch IDs
     * @returns Promise<OnboardingProgress> - Initialized or existing progress
     */
    static async initializeProgress(request: InitOnboardingProgressRequest): Promise<OnboardingProgress> {
        try {
            // Check if progress already exists
            const existingProgress = await OnboardingProgressModel.findByTerminalId(request.terminalId);

            if (existingProgress) {
                return existingProgress;
            }

            // Create new progress with default steps
            return await OnboardingProgressModel.create(
                request.terminalId,
                request.tenantId,
                request.branchId,
                ONBOARDING_STEPS_CONFIG
            );
        } catch (error) {
            throw new Error(
                `Failed to initialize onboarding progress: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  getProgress
     * @desc    Get onboarding progress for a terminal
     * @param   terminalId - Terminal ID
     * @returns Promise<OnboardingProgress | null> - Progress data or null
     */
    static async getProgress(terminalId: string): Promise<OnboardingProgress | null> {
        try {
            return await OnboardingProgressModel.findByTerminalId(terminalId);
        } catch (error) {
            throw new Error(
                `Failed to get onboarding progress: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  startStep
     * @desc    Mark a step as in progress
     * @param   terminalId - Terminal ID
     * @param   stepType - Step type to start
     * @returns Promise<OnboardingProgress> - Updated progress
     */
    static async startStep(terminalId: string, stepType: OnboardingStepType): Promise<OnboardingProgress> {
        try {
            const progress = await OnboardingProgressModel.findByTerminalId(terminalId);

            if (!progress) {
                throw new Error(`Onboarding progress not found for terminal: ${terminalId}`);
            }

            return await OnboardingProgressModel.updateStep(
                progress.progressId,
                stepType,
                'IN_PROGRESS'
            );
        } catch (error) {
            throw new Error(
                `Failed to start step: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  completeStep
     * @desc    Mark a step as completed
     * @param   terminalId - Terminal ID
     * @param   stepType - Step type to complete
     * @param   metadata - Optional metadata to store with step
     * @returns Promise<OnboardingProgress> - Updated progress
     */
    static async completeStep(
        terminalId: string,
        stepType: OnboardingStepType,
        metadata?: Record<string, any>
    ): Promise<OnboardingProgress> {
        try {
            const progress = await OnboardingProgressModel.findByTerminalId(terminalId);

            if (!progress) {
                throw new Error(`Onboarding progress not found for terminal: ${terminalId}`);
            }

            return await OnboardingProgressModel.updateStep(
                progress.progressId,
                stepType,
                'COMPLETED',
                undefined,
                metadata
            );
        } catch (error) {
            throw new Error(
                `Failed to complete step: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  failStep
     * @desc    Mark a step as failed with error message
     * @param   terminalId - Terminal ID
     * @param   stepType - Step type that failed
     * @param   errorMessage - Error description
     * @returns Promise<OnboardingProgress> - Updated progress
     */
    static async failStep(
        terminalId: string,
        stepType: OnboardingStepType,
        errorMessage: string
    ): Promise<OnboardingProgress> {
        try {
            const progress = await OnboardingProgressModel.findByTerminalId(terminalId);

            if (!progress) {
                throw new Error(`Onboarding progress not found for terminal: ${terminalId}`);
            }

            return await OnboardingProgressModel.updateStep(
                progress.progressId,
                stepType,
                'FAILED',
                errorMessage
            );
        } catch (error) {
            throw new Error(
                `Failed to record step failure: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  skipStep
     * @desc    Mark a step as skipped
     * @param   terminalId - Terminal ID
     * @param   stepType - Step type to skip
     * @param   reason - Optional reason for skipping
     * @returns Promise<OnboardingProgress> - Updated progress
     */
    static async skipStep(
        terminalId: string,
        stepType: OnboardingStepType,
        reason?: string
    ): Promise<OnboardingProgress> {
        try {
            const progress = await OnboardingProgressModel.findByTerminalId(terminalId);

            if (!progress) {
                throw new Error(`Onboarding progress not found for terminal: ${terminalId}`);
            }

            return await OnboardingProgressModel.updateStep(
                progress.progressId,
                stepType,
                'SKIPPED',
                undefined,
                reason ? { skipReason: reason } : undefined
            );
        } catch (error) {
            throw new Error(
                `Failed to skip step: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  updateStep
     * @desc    Update a step with custom status and data
     * @param   request - Update request with step details
     * @returns Promise<OnboardingProgress> - Updated progress
     */
    static async updateStep(request: UpdateOnboardingStepRequest): Promise<OnboardingProgress> {
        try {
            const progress = await OnboardingProgressModel.findByTerminalId(request.terminalId);

            if (!progress) {
                throw new Error(`Onboarding progress not found for terminal: ${request.terminalId}`);
            }

            return await OnboardingProgressModel.updateStep(
                progress.progressId,
                request.stepType,
                request.status,
                request.errorMessage,
                request.metadata
            );
        } catch (error) {
            throw new Error(
                `Failed to update step: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  updateTenantBranchInfo
     * @desc    Update tenant and branch IDs after terminal activation
     * @param   terminalId - Terminal ID
     * @param   tenantId - Tenant ID
     * @param   branchId - Branch ID
     * @returns Promise<OnboardingProgress> - Updated progress
     */
    static async updateTenantBranchInfo(
        terminalId: string,
        tenantId: string,
        branchId: string
    ): Promise<OnboardingProgress> {
        try {
            const progress = await OnboardingProgressModel.findByTerminalId(terminalId);

            if (!progress) {
                throw new Error(`Onboarding progress not found for terminal: ${terminalId}`);
            }

            return await OnboardingProgressModel.updateTenantAndBranch(
                progress.progressId,
                tenantId,
                branchId
            );
        } catch (error) {
            throw new Error(
                `Failed to update tenant/branch info: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  resetProgress
     * @desc    Reset onboarding progress to initial state
     * @param   terminalId - Terminal ID
     * @returns Promise<OnboardingProgress> - Reset progress
     */
    static async resetProgress(terminalId: string): Promise<OnboardingProgress> {
        try {
            const progress = await OnboardingProgressModel.findByTerminalId(terminalId);

            if (!progress) {
                throw new Error(`Onboarding progress not found for terminal: ${terminalId}`);
            }

            return await OnboardingProgressModel.reset(progress.progressId);
        } catch (error) {
            throw new Error(
                `Failed to reset progress: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  deleteProgress
     * @desc    Delete onboarding progress (for cleanup or re-onboarding)
     * @param   terminalId - Terminal ID
     * @returns Promise<boolean> - Success status
     */
    static async deleteProgress(terminalId: string): Promise<boolean> {
        try {
            const progress = await OnboardingProgressModel.findByTerminalId(terminalId);

            if (!progress) {
                return true; // Already doesn't exist
            }

            return await OnboardingProgressModel.delete(progress.progressId);
        } catch (error) {
            throw new Error(
                `Failed to delete progress: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  getNextStep
     * @desc    Get the next step to complete in onboarding
     * @param   terminalId - Terminal ID
     * @returns Promise<OnboardingStepType | null> - Next step type or null if complete
     */
    static async getNextStep(terminalId: string): Promise<OnboardingStepType | null> {
        try {
            const progress = await OnboardingProgressModel.findByTerminalId(terminalId);

            if (!progress) {
                return 'TERMINAL_ACTIVATION'; // Default first step
            }

            if (progress.overallStatus === 'COMPLETED') {
                return null;
            }

            // Find first not-started or failed step
            const nextStep = progress.steps.find(
                step => step.status === 'NOT_STARTED' || step.status === 'FAILED'
            );

            return nextStep ? nextStep.stepType : null;
        } catch (error) {
            throw new Error(
                `Failed to get next step: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  isOnboardingComplete
     * @desc    Check if onboarding is complete for a terminal
     * @param   terminalId - Terminal ID
     * @returns Promise<boolean> - Is complete
     */
    static async isOnboardingComplete(terminalId: string): Promise<boolean> {
        try {
            const progress = await OnboardingProgressModel.findByTerminalId(terminalId);
            return progress?.overallStatus === 'COMPLETED';
        } catch (error) {
            throw new Error(
                `Failed to check completion status: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}
