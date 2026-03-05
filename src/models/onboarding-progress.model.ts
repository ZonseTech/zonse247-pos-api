import prisma from '../databases/prisma/client';
import type {
    OnboardingProgress,
    OnboardingStepType,
    OnboardingStepStatus
} from 'on-boarding';

/**
 * @class   OnboardingProgressModel
 * @desc    Data access layer for onboarding progress tracking
 */
export class OnboardingProgressModel {
    /**
     * @method  findByTerminalId
     * @desc    Find onboarding progress by terminal ID
     * @param   terminalId - Unique terminal identifier
     * @returns Promise<OnboardingProgress | null> - Progress data or null
     */
    static async findByTerminalId(terminalId: string): Promise<OnboardingProgress | null> {
        try {
            const progress = await prisma.onboardingProgress.findUnique({
                where: { terminalId },
                include: {
                    steps: {
                        orderBy: { stepOrder: 'asc' }
                    }
                }
            });

            if (!progress) return null;

            return this.mapToOnboardingProgress(progress);
        } catch (error) {
            throw new Error(
                `Error finding onboarding progress: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  findByProgressId
     * @desc    Find onboarding progress by progress ID
     * @param   progressId - Unique progress identifier
     * @returns Promise<OnboardingProgress | null> - Progress data or null
     */
    static async findByProgressId(progressId: string): Promise<OnboardingProgress | null> {
        try {
            const progress = await prisma.onboardingProgress.findUnique({
                where: { progressId },
                include: {
                    steps: {
                        orderBy: { stepOrder: 'asc' }
                    }
                }
            });

            if (!progress) return null;

            return this.mapToOnboardingProgress(progress);
        } catch (error) {
            throw new Error(
                `Error finding onboarding progress by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  create
     * @desc    Create a new onboarding progress record with default steps
     * @param   terminalId - Terminal ID
     * @param   tenantId - Optional tenant ID
     * @param   branchId - Optional branch ID
     * @param   defaultSteps - Array of default step configurations
     * @returns Promise<OnboardingProgress> - Created progress with steps
     */
    static async create(
        terminalId: string,
        tenantId?: string,
        branchId?: string,
        defaultSteps: Array<{ stepType: OnboardingStepType; order: number; required: boolean }> = []
    ): Promise<OnboardingProgress> {
        try {
            const progress = await prisma.onboardingProgress.create({
                data: {
                    terminalId,
                    tenantId: tenantId || null,
                    branchId: branchId || null,
                    currentStep: 'TERMINAL_ACTIVATION',
                    overallStatus: 'NOT_STARTED',
                    totalSteps: defaultSteps.length,
                    completedSteps: 0,
                    steps: {
                        create: defaultSteps.map(step => ({
                            stepType: step.stepType,
                            stepOrder: step.order,
                            status: 'NOT_STARTED',
                            retryCount: 0
                        }))
                    }
                },
                include: {
                    steps: {
                        orderBy: { stepOrder: 'asc' }
                    }
                }
            });

            return this.mapToOnboardingProgress(progress);
        } catch (error) {
            throw new Error(
                `Error creating onboarding progress: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  updateStep
     * @desc    Update a specific onboarding step
     * @param   progressId - Progress ID
     * @param   stepType - Step type to update
     * @param   status - New status
     * @param   errorMessage - Optional error message
     * @param   metadata - Optional metadata
     * @returns Promise<OnboardingProgress> - Updated progress
     */
    static async updateStep(
        progressId: string,
        stepType: OnboardingStepType,
        status: OnboardingStepStatus,
        errorMessage?: string,
        metadata?: Record<string, any>
    ): Promise<OnboardingProgress> {
        try {
            const updateData: any = {
                status,
                retryCount: status === 'FAILED' ? { increment: 1 } : undefined,
                errorMessage: errorMessage || null,
                metadata: metadata ? JSON.stringify(metadata) : undefined
            };

            if (status === 'IN_PROGRESS') {
                updateData.startedAt = new Date();
            } else if (status === 'COMPLETED' || status === 'FAILED' || status === 'SKIPPED') {
                updateData.completedAt = new Date();
            }

            await prisma.onboardingStep.update({
                where: {
                    unique_progress_step: {
                        progressId,
                        stepType
                    }
                },
                data: updateData
            });

            const steps = await prisma.onboardingStep.findMany({
                where: { progressId },
                orderBy: { stepOrder: 'asc' }
            });

            const completedSteps = steps.filter(
                s => s.status === 'COMPLETED' || s.status === 'SKIPPED'
            ).length;

            const hasFailedSteps = steps.some(s => s.status === 'FAILED');
            const allCompleted = completedSteps === steps.length;
            const hasInProgress = steps.some(s => s.status === 'IN_PROGRESS');

            let currentStep = stepType;
            let overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' = 'IN_PROGRESS';

            if (allCompleted) {
                overallStatus = 'COMPLETED';
            } else if (hasFailedSteps) {
                overallStatus = 'FAILED';
            } else if (hasInProgress || completedSteps > 0) {
                overallStatus = 'IN_PROGRESS';
                const nextStep = steps.find(s => s.status === 'NOT_STARTED');
                if (nextStep) {
                    currentStep = nextStep.stepType as OnboardingStepType;
                }
            }

            await prisma.onboardingProgress.update({
                where: { progressId },
                data: {
                    currentStep,
                    overallStatus,
                    completedSteps,
                    lastUpdatedAt: new Date()
                }
            });

            return await this.findByProgressId(progressId) as OnboardingProgress;
        } catch (error) {
            throw new Error(
                `Error updating onboarding step: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  updateTenantAndBranch
     * @desc    Update tenant and branch IDs after they're available
     * @param   progressId - Progress ID
     * @param   tenantId - Tenant ID
     * @param   branchId - Branch ID
     * @returns Promise<OnboardingProgress> - Updated progress
     */
    static async updateTenantAndBranch(
        progressId: string,
        tenantId: string,
        branchId: string
    ): Promise<OnboardingProgress> {
        try {
            await prisma.onboardingProgress.update({
                where: { progressId },
                data: {
                    tenantId,
                    branchId,
                    lastUpdatedAt: new Date()
                }
            });

            return await this.findByProgressId(progressId) as OnboardingProgress;
        } catch (error) {
            throw new Error(
                `Error updating tenant and branch: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  delete
     * @desc    Delete onboarding progress (and cascade delete steps)
     * @param   progressId - Progress ID
     * @returns Promise<boolean> - Success status
     */
    static async delete(progressId: string): Promise<boolean> {
        try {
            await prisma.onboardingProgress.delete({
                where: { progressId }
            });
            return true;
        } catch (error) {
            throw new Error(
                `Error deleting onboarding progress: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  reset
     * @desc    Reset onboarding progress to start
     * @param   progressId - Progress ID
     * @returns Promise<OnboardingProgress> - Reset progress
     */
    static async reset(progressId: string): Promise<OnboardingProgress> {
        try {
            // Reset all steps
            await prisma.onboardingStep.updateMany({
                where: { progressId },
                data: {
                    status: 'NOT_STARTED',
                    startedAt: null,
                    completedAt: null,
                    errorMessage: null,
                    retryCount: 0,
                    metadata: null
                }
            });

            // Reset progress
            await prisma.onboardingProgress.update({
                where: { progressId },
                data: {
                    currentStep: 'TERMINAL_ACTIVATION',
                    overallStatus: 'NOT_STARTED',
                    completedSteps: 0,
                    lastUpdatedAt: new Date()
                }
            });

            return await this.findByProgressId(progressId) as OnboardingProgress;
        } catch (error) {
            throw new Error(
                `Error resetting onboarding progress: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * @method  mapToOnboardingProgress
     * @desc    Map Prisma result to OnboardingProgress type
     * @param   progress - Prisma result
     * @returns OnboardingProgress - Mapped progress
     */
    private static mapToOnboardingProgress(progress: any): OnboardingProgress {
        const totalSteps = progress.steps.length;
        const completedSteps = progress.steps.filter(
            (s: any) => s.status === 'COMPLETED' || s.status === 'SKIPPED'
        ).length;

        return {
            progressId: progress.progressId,
            terminalId: progress.terminalId,
            tenantId: progress.tenantId,
            branchId: progress.branchId,
            currentStep: progress.currentStep as OnboardingStepType,
            overallStatus: progress.overallStatus as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
            steps: progress.steps.map((step: any) => ({
                stepType: step.stepType as OnboardingStepType,
                status: step.status as OnboardingStepStatus,
                order: step.stepOrder,
                startedAt: step.startedAt,
                completedAt: step.completedAt,
                errorMessage: step.errorMessage,
                retryCount: step.retryCount,
                metadata: step.metadata ? JSON.parse(step.metadata) : null
            })),
            completedSteps,
            totalSteps,
            completionPercentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
            lastUpdatedAt: progress.lastUpdatedAt,
            createdAt: progress.createdAt
        };
    }
}
