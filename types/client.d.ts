
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

interface AuthenticatedRequest extends Request {
    client?: Client;
    tenant?: Tenant;
    clientUuid?: string;
    tenantId?: string;
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
    verificationToken: string;
    status: string;
    emailSent?: boolean;
    registeredAt: string;
    activatedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    synced?: number;
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

