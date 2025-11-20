// import { ApiResponse } from "./network";

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    subscriptionStatus?: string;
}

export interface Role {
    roleId: string;
    tenantId: string;
    branchId?: string | null;
    name: string;
    displayName: string;
    description?: string | null;
    isSystemRole?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Permission {
    permissionId: string;
    name: string;
    displayName: string;
    description?: string | null;
    category: string;
    scope?: any;
    isSystemPermission?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface RolePermission {
    rolePermissionId: string;
    roleId: string;
    permissionId: string;
    createdAt?: Date;
}

export interface CreateRoleRequest {
    tenantId: string;
    branchId?: string | null;
    name: string;
    displayName: string;
    description?: string | null;
    isActive?: boolean;
    isSystemRole?: boolean;
}

export interface CreateRolePermissionRequest {
    roleId: string;
    permissionId: string;
}

export interface CreatePermissionRequest {
    name: string;
    scope: any
}

export interface BulkRolePermissionRequest {
    roleId: string;
    permissionIds: Array<string>
}

export interface CreateRoleRequest {
    tenantId: string;
    branchId?: string | null;
    name: string;
    displayName: string;
    description?: string | null;
    isActive?: boolean;
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {
    uuid: string;
}

export interface CreatePermissionRequest {
    name: string;
    displayName: string;
    description?: string | null;
    category: string;
    scope: any;
}

export interface UpdatePermissionRequest extends Partial<CreatePermissionRequest> {
    uuid: string;
}

export interface BulkRolePermissionRequest {
    roleId: string;
    permissionIds: Array<string>;
}

export interface FilterState {
    searchTerm: string;
    selectedCategory: string;
    selectedScope: string;
}

export interface ModalState {
    showRoleModal: boolean;
    showPermissionModal: boolean;
    showAssignModal: boolean;
    editingRole: Role | null;
    editingPermission: Permission | null;
    selectedRole: Role | null;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
    total: number;
    page: number;
    limit: number;
}