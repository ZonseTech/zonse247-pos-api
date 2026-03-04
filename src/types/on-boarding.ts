import { Tenant } from "tenant";

export interface TerminalVerificationParams {
    tenantCode: string;
    verificationToken: string;
    os: string;
    hostname: string;
    macAddress: string;
}

export type ValidationParams = {
    tenantId: string;
    branchId: string;
    terminalId: string;
    verificationKey: string;
}

export interface OnboardingStatus {
    tenant: Omit<Tenant, 'verificationToken'>;
    subscription: any;
    branches: any[];
    terminals: any[];
    onboarding: {
        steps: {
            tenantRegistered: boolean;
            subscriptionActive: boolean;
            branchCreated: boolean;
            terminalSetup: boolean;
        };
        completedSteps: number;
        totalSteps: number;
        completionPercentage: number;
        isComplete: boolean;
    };
}

/**
 * Onboarding step types for tracking progress
 */
export type OnboardingStepType =
    | 'TERMINAL_ACTIVATION'      // Fetch terminal details from cloud
    | 'TERMINAL_DETAILS_SAVE'    // Save terminal, tenant, branch, subscription locally
    | 'MRA_SETUP'                // MRA configuration and registration
    | 'CUSTOMERS_SYNC'           // Sync customers from cloud
    | 'CATEGORIES_SYNC'          // Sync categories from cloud
    | 'SUBSCRIPTION_PLANS_SYNC'  // Sync subscription plans
    | 'PAYMENT_METHODS_SYNC'     // Sync payment methods
    | 'PAYMENT_PROVIDERS_SYNC'   // Sync payment service providers
    | 'PRODUCTS_SYNC'            // Sync products (future)
    | 'INVENTORY_SYNC'           // Sync inventory (future)
    | 'USERS_SYNC'               // Sync users (future)
    | 'SETTINGS_SYNC';           // Sync settings (future)

/**
 * Status of an onboarding step
 */
export type OnboardingStepStatus =
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'FAILED'
    | 'SKIPPED';

/**
 * Individual onboarding step progress
 */
export interface OnboardingStep {
    stepType: OnboardingStepType;
    status: OnboardingStepStatus;
    order: number;
    startedAt?: Date | string | null;
    completedAt?: Date | string | null;
    errorMessage?: string | null;
    retryCount: number;
    metadata?: Record<string, any> | null;
}

/**
 * Complete onboarding progress for a terminal
 */
export interface OnboardingProgress {
    progressId: string;
    terminalId: string;
    tenantId?: string | null;
    branchId?: string | null;
    currentStep: OnboardingStepType;
    overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    steps: OnboardingStep[];
    completedSteps: number;
    totalSteps: number;
    completionPercentage: number;
    lastUpdatedAt: Date | string;
    createdAt: Date | string;
}

/**
 * Request to update onboarding step progress
 */
export interface UpdateOnboardingStepRequest {
    terminalId: string;
    stepType: OnboardingStepType;
    status: OnboardingStepStatus;
    errorMessage?: string;
    metadata?: Record<string, any>;
}

/**
 * Request to initialize onboarding progress
 */
export interface InitOnboardingProgressRequest {
    terminalId: string;
    tenantId?: string;
    branchId?: string;
}

/**
 * Default onboarding steps configuration
 */
export const DEFAULT_ONBOARDING_STEPS: Array<{ stepType: OnboardingStepType; order: number; required: boolean }> = [
    { stepType: 'TERMINAL_ACTIVATION', order: 1, required: true },
    { stepType: 'TERMINAL_DETAILS_SAVE', order: 2, required: true },
    { stepType: 'SUBSCRIPTION_PLANS_SYNC', order: 3, required: false },
    { stepType: 'PAYMENT_METHODS_SYNC', order: 4, required: false },
    { stepType: 'PAYMENT_PROVIDERS_SYNC', order: 5, required: false },
    { stepType: 'CATEGORIES_SYNC', order: 6, required: false },
    { stepType: 'CUSTOMERS_SYNC', order: 7, required: false },
    { stepType: 'MRA_SETUP', order: 8, required: false },
];