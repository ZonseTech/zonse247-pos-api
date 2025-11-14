interface User {
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
    permissions?: string[] | null;
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

type UserStatus = 'active' | 'inactive' | 'suspended';

interface CreateUserRequest extends Omit<User, 'uuid' | 'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'lastLogout' | 'roleName' | 'permissions'> {

}

interface PublicUser extends Omit<User, 'password'> {
    roleName?: string;
    permissions?: string[];
}

interface UserDetailsModalProps {
    user?: User | null;
    isOpen?: boolean;
    onClose?: () => void;
}

interface UserDetailsModalProps {
    user?: User | null;
    isOpen?: boolean;
    onClose?: () => void;
}

interface UserFormModalProps {
    user?: User;
    isOpen?: boolean;
    onClose?: () => void;
    onUserSaved?: () => void;
}
