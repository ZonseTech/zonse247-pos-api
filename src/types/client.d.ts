
interface ClientQueryParams {
    status?: string;
    subscriptionStatus?: string;
    country?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}

interface RegisterClientRequest {
    companyName: string;
    ownerName: string;
    email: string;
    phone: string;
    address?: string;
    country?: string;
    timezone?: string;
}

interface VerifyClientRequest {
    clientUuid: string;
    authKey: string;
}

interface AuthenticatedRequest extends Request {
    client?: Client;
    clientUuid?: string;
}

interface ClientProps extends Omit<Client, 'authKey'> {

}


interface Client {
    uuid: string;
    clientCode: string;
    companyName: string;
    ownerName: string;
    email: string;
    phone: string;
    address: string;
    country: string;
    timezone: string;
    subscriptionStatus: 'active' | 'inactive' | 'suspended' | 'expired' | 'trial' | 'cancelled';
    trialEndsAt: string;
    authKey: string;
    status: string;
    registeredAt: string;
    activatedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    synced?: number;
}

interface OnboardingStatus {
    client: Omit<Client, 'authKey'>;
    subscription: any;
    shops: any[];
    workstations: any[];
    onboarding: {
        steps: {
            clientRegistered: boolean;
            subscriptionActive: boolean;
            shopCreated: boolean;
            workstation_Setup: boolean;
        };
        completedSteps: number;
        totalSteps: number;
        completionPercentage: number;
        isComplete: boolean;
    };
}

interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

interface RegisterClientRequest {
    companyName: string;
    ownerName: string;
    email: string;
    phone: string;
    address?: string;
    country?: string;
    timezone?: string;
}

interface VerifyClientRequest {
    clientUuid: string;
    authKey: string;
}

