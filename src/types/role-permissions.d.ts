interface Role {
    uuid: string;
    clientUuid: string;
    shopUuid?: string | null;
    name: string;
    displayName: string;
    description?: string | null;
    isSystemRole?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface Permission {
    uuid: string;
    name: string;
    displayName: string;
    description?: string | null;
    category: string;
    scope?: PermissionScope;
    isSystemPermission?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PermissionCategory { }

interface PermissionScope { }

interface RolePermission {
    uuid: string;
    roleUuid: string;
    permissionUuid: string;
    createdAt?: Date;
}

interface CreateRoleRequest {
    clientUuid: string;
    shopUuid?: string | null;
    name: string;
    displayName: string;
    description?: string | null;
    isActive?: boolean;
    isSystemRole?: boolean;
}

interface CreateRolePermissionRequest {
    roleUuid: string;
    permissionUuid: string;
}

interface CreatePermissionRequest {
    name: string;
    scope: PermissionScope
}

interface BulkRolePermissionRequest {
    roleUuid: string;
    permissionUuids: Array<string>
}

interface Role {
    uuid: string;
    clientUuid: string;
    shopUuid?: string | null;
    name: string;
    displayName: string;
    description?: string | null;
    isSystemRole?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface Permission {
    uuid: string;
    name: string;
    displayName: string;
    description?: string | null;
    category: string;
    scope?: PermissionScope;
    isSystemPermission?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface RolePermission {
    uuid: string;
    roleUuid: string;
    permissionUuid: string;
    createdAt?: Date;
}

interface CreateRoleRequest {
    clientUuid: string;
    shopUuid?: string | null;
    name: string;
    displayName: string;
    description?: string | null;
    isActive?: boolean;
}

interface UpdateRoleRequest extends Partial<CreateRoleRequest> {
    uuid: string;
}

interface CreateRolePermissionRequest {
    roleUuid: string;
    permissionUuid: string;
}

interface CreatePermissionRequest {
    name: string;
    displayName: string;
    description?: string | null;
    category: string;
    scope: PermissionScope;
}

interface UpdatePermissionRequest extends Partial<CreatePermissionRequest> {
    uuid: string;
}

interface BulkRolePermissionRequest {
    roleUuid: string;
    permissionUuids: Array<string>;
}

interface FilterState {
    searchTerm: string;
    selectedCategory: string;
    selectedScope: string;
}

interface ModalState {
    showRoleModal: boolean;
    showPermissionModal: boolean;
    showAssignModal: boolean;
    editingRole: Role | null;
    editingPermission: Permission | null;
    selectedRole: Role | null;
}

interface PaginatedResponse<T> extends ApiResponse<T> {
    total: number;
    page: number;
    limit: number;
}

interface RoleTabProps {
    roles: Role[];
    onCreateRole: () => void;
    onEditRole: (role: Role) => void;
    onDeleteRole: (uuid: string) => void;
    onAssignPermissions: (role: Role) => void;
}

interface PermissionTabProps {
    permissions: Permission[];
    onCreatePermission: () => void;
    onEditPermission: (permission: Permission) => void;
    onDeletePermission: (uuid: string) => void;
}

interface AssignmentTabProps {
    roles: Role[];
    permissions: Permission[];
    onBulkAssign: (roleUuid: string, permissionUuids: string[]) => void;
}

interface RoleModalProps {
    role: Role | null;
    onSave: (data: CreateRoleRequest | UpdateRoleRequest) => void;
    onClose: () => void;
}

interface PermissionModalProps {
    permission: Permission | null;
    categories: string[];
    scopes: PermissionScope[];
    onSave: (data: CreatePermissionRequest | UpdatePermissionRequest) => void;
    onClose: () => void;
}

interface AssignPermissionsModalProps {
    role: Role;
    permissions: Permission[];
    currentPermissions: Permission[];
    onAssign: (permissionUuids: string[]) => void;
    onClose: () => void;
}

interface SearchFilterProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    showCategoryFilter?: boolean;
    showScopeFilter?: boolean;
    selectedCategory?: string;
    selectedScope?: string;
    categories?: string[];
    scopes?: PermissionScope[];
    onCategoryChange?: (category: string) => void;
    onScopeChange?: (scope: string) => void;
}

interface ErrorAlertProps {
    error: string | null;
    onClose: () => void;
}

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}