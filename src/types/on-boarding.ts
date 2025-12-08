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
    tenant: Omit<Tenant, 'verificationToken' | 'authKey'>;
    subscription: any;
    shops: any[];
    workstations: any[];
    onboarding: {
        steps: {
            tenantRegistered: boolean;
            subscriptionActive: boolean;
            shopCreated: boolean;
            workstationSetup: boolean;
        };
        completedSteps: number;
        totalSteps: number;
        completionPercentage: number;
        isComplete: boolean;
    };
}