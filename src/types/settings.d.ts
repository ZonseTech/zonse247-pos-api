interface TerminalSettings {
    settingId: string;
    app: string;
    store: string;
    verificationToken: string;
    addressLine1?: string;
    addressLine2?: string;
    tenantSignature: string;
    country?: string;
    city?: string;
    contact: string;
    tax: string | number;
    symbol: string;
    chargeTax?: boolean;
    footer: string;
    img?: string | null;
    tillName?: string;
    status: "active" | "inactive" | "suspended",
    synced?: 1 | 0;
    tenantId: string;
    branchId: string;
    terminalId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface Settings {
    synced?: 1 | 0;
    settingId: string;
    settings: Setting;
}

interface Setting {
    settingId: string;
    tenantId: string;
    branchId: string;
    tenantSignature: string;
    terminalId: string;
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
    tenantId: string;
    branchId: string;
    terminalId: string;
    settings: Setting[];
}

interface CreateSettingRequest {
    tenantId: string;
    branchId: string;
    terminalId: string;
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
