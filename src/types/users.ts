export interface User {
    userId: string;
    tenantId: string;
    branchId: string;
    username: string;
    password: string;
    fullname: string;
    email?: string | null;
    departmentId?: string | null;
    departmentName?: string | null;
    phone?: string | null;
    roleId: string;
    roleName?: string | null;
    status?: UserStatus;
    accessibleShops?: string[] | null;
    allowedWorkstations?: string[] | null;
    maxDiscountPercent?: number;
    canOverridePrices?: boolean;
    pinCode?: string | null;
    currentBranchId?: string | null;
    lastLogin?: Date | null;
    lastLogout?: Date | null;
    passwordChangedAt?: Date;
    forcePasswordChange?: boolean;
    roles?: Array<string>;
    permissions?: Array<string>;
    synced?: 0 | 1,
    createdAt?: Date;
    updatedAt?: Date;
}

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface PublicUser extends Omit<User, 'password'> {
    roleName?: string;
    permissions?: string[];
}

export interface UserDetailsModalProps {
    user?: User | null;
    isOpen?: boolean;
    onClose?: () => void;
}

export interface UserDetailsModalProps {
    user?: User | null;
    isOpen?: boolean;
    onClose?: () => void;
}

export interface UserFormModalProps {
    user?: User;
    isOpen?: boolean;
    onClose?: () => void;
    onUserSaved?: () => void;
}
