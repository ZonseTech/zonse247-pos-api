interface WorkstatSettings {
    uuid: string;
    app: string;
    store: string;
    addressLine1?: string;
    addressLine2?: string;
    country?: string;
    city?: string;
    contact: string;
    tax: string | number;
    symbol: string;
    chargeTax?: boolean;
    footer: string;
    img?: string | null;
    tillName?: string;
    isActive: "active" | "inactive" | "suspended",
    synced?: 1 | 0;
    clientUuid: string;
    shopUuid: string;
    workstationUuid: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface Settings {
    synced?: 1 | 0;
    uuid: string;
    settings: Setting;
}

interface SetupParams {
    uuid: string;
    isCompleted: boolean;
    accountActivated: boolean;
    shopConfigured: boolean;
    workstationSetup: boolean;
}

interface Setting {
    uuid: string;
    clientUuid: string;
    shopUuid: string;
    workstationUuid: string;
    key: string;
    value: string | number | boolean;
    category: 'system' | 'user' | 'shop' | 'workstation';
    description?: string;
    isActive: "active" | "inactive" | "suspended";
    createdAt?: Date;
    updatedAt?: Date;
    synced?: number;
}

interface SettingsGroup {
    clientUuid: string;
    shopUuid: string;
    workstationUuid: string;
    settings: Setting[];
}

interface CreateSettingRequest {
    clientUuid: string;
    shopUuid: string;
    workstationUuid: string;
}

interface UpdateSettingRequest {
    value: string | number | boolean;
    description?: string;
    isActive?: boolean;
}

interface InitializationState {
    isAccountVerified: boolean
    isLoading: boolean
    error: string | null
    retryCount: number
}

interface InitializationResult {
    success: boolean
    verified?: boolean
    error?: string
}
