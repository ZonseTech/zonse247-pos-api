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
 * Options for generating onboarding steps
 */
export interface OnboardingStepsOptions {
    /** Whether MRA compliance is enabled for the tenant */
    isMraEnabled?: boolean;
    /** Whether to include product sync steps (default: false) */
    includeProductSync?: boolean;
    /** Whether to include inventory sync steps (default: false) */
    includeInventorySync?: boolean;
    /** Whether to include user sync steps (default: false) */
    includeUserSync?: boolean;
}

/**
 * Onboarding step configuration
 */
export interface OnboardingStepConfig {
    stepType: OnboardingStepType;
    order: number;
    required: boolean;
}

/**
 * Default onboarding steps configuration
 * Note: MRA_SETUP is included by default but can be skipped based on tenant's isMraEnabled setting
 */
export const DEFAULT_ONBOARDING_STEPS: OnboardingStepConfig[] = [
    { stepType: 'TERMINAL_ACTIVATION', order: 1, required: true },
    { stepType: 'TERMINAL_DETAILS_SAVE', order: 2, required: true },
    { stepType: 'SUBSCRIPTION_PLANS_SYNC', order: 3, required: false },
    { stepType: 'PAYMENT_METHODS_SYNC', order: 4, required: false },
    { stepType: 'PAYMENT_PROVIDERS_SYNC', order: 5, required: false },
    { stepType: 'CATEGORIES_SYNC', order: 6, required: false },
    { stepType: 'CUSTOMERS_SYNC', order: 7, required: false },
    { stepType: 'MRA_SETUP', order: 8, required: false },
];

/**
 * Get onboarding steps based on tenant's MRA compliance setting
 * 
 * @param options - Options for customizing onboarding steps
 * @returns Array of onboarding step configurations
 * 
 * @example
 * // For MRA-enabled tenant
 * const steps = getOnboardingSteps({ isMraEnabled: true });
 * 
 * @example
 * // For non-MRA tenant (skips MRA_SETUP step)
 * const steps = getOnboardingSteps({ isMraEnabled: false });
 */
export function getOnboardingSteps(options: OnboardingStepsOptions = {}): OnboardingStepConfig[] {
    const {
        isMraEnabled = false,
        includeProductSync = false,
        includeInventorySync = false,
        includeUserSync = false,
    } = options;

    // Start with base steps (always required)
    const steps: OnboardingStepConfig[] = [
        { stepType: 'TERMINAL_ACTIVATION', order: 1, required: true },
        { stepType: 'TERMINAL_DETAILS_SAVE', order: 2, required: true },
        { stepType: 'SUBSCRIPTION_PLANS_SYNC', order: 3, required: false },
        { stepType: 'PAYMENT_METHODS_SYNC', order: 4, required: false },
        { stepType: 'PAYMENT_PROVIDERS_SYNC', order: 5, required: false },
        { stepType: 'CATEGORIES_SYNC', order: 6, required: false },
        { stepType: 'CUSTOMERS_SYNC', order: 7, required: false },
    ];

    let order = 8;

    // Add optional sync steps if requested
    if (includeProductSync) {
        steps.push({ stepType: 'PRODUCTS_SYNC', order: order++, required: false });
    }

    if (includeInventorySync) {
        steps.push({ stepType: 'INVENTORY_SYNC', order: order++, required: false });
    }

    if (includeUserSync) {
        steps.push({ stepType: 'USERS_SYNC', order: order++, required: false });
    }

    // Only include MRA_SETUP if tenant is MRA-enabled
    if (isMraEnabled) {
        steps.push({ stepType: 'MRA_SETUP', order: order++, required: false });
    }

    // Re-order steps sequentially
    return steps.map((step, index) => ({
        ...step,
        order: index + 1,
    }));
}

/**
 * Check if MRA_SETUP step should be included in onboarding
 */
export function shouldIncludeMraSetup(isMraEnabled?: boolean): boolean {
    return isMraEnabled === true;
}