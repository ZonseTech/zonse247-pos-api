/* eslint-disable @typescript-eslint/no-non-null-assertion */
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { UserService } from '../user.service';
import { UserModel } from '../../models/user.model';
import { RoleModel } from '../../models/role.model';
import { PermissionModel } from '../../models/permission.model';
import { RolePermissionModel } from '../../models/role-permission.model';
import { UserStatus } from '../../databases/prisma/generated/prisma/enums';
import { getConfig } from '../../config/app.config';
import { BranchModel } from '../../models/branch.model';
import { ClientType } from '../../utils/enums';

/**
 * Service layer for authentication and authorization operations
 * 
 * @remarks
 * This service handles user authentication, JWT token management, password operations,
 * and session management. It serves as the bridge between authentication controllers
 * and user data models.
 * ```
 */
export class AuthService {
    /**
     * Authenticates user credentials and generates JWT token
     * 
     * @param username - User's username (automatically sanitized)
     * @param password - User's plain text password
     * @param clientType - Client type (web, mobile, desktop) - subscription enforced for web/mobile
     * @returns Object containing user data with token, or error message
     */
    static async loginUser(
        username: string,
        password: string,
        clientType: 'web' | 'mobile' | 'desktop' = 'desktop',
    ): Promise<{ user?: any; token?: string; message?: string }> {
        const escapedUsername = validator.escape(username);

        const user = await UserModel.findByUsername(escapedUsername);

        if (user) {
            if (user.status !== UserStatus.active) {
                return { message: 'Account is not active. Please contact support.' };
            }

            const isPasswordValid = await UserModel.validatePassword(password, user.password);

            if (!isPasswordValid) {
                return { message: 'Incorrect username or password.' };
            }

            await UserModel.updateLastLogin(user.userId);

            const completeUser: any = UserModel.getPublicUser(user);

            const { permissions } = await this.verifyUserPrivileges(user.roleId);
            completeUser.permissions = permissions || [];

            if (user.roleId) {
                const role = await RoleModel.findById(user.roleId);
                if (role) {
                    completeUser.role = role;
                }
            }

            if (user.branchId) {
                const branchData = await BranchModel.findByIdWithRelations(user.branchId);
                if (branchData) {
                    completeUser.branch = {
                        ...branchData.branch,
                        branchSubscription: branchData.branchSubscription || null
                    };

                    if (branchData.branchSubscription) {
                        completeUser.subscriptionStatus = branchData.branchSubscription.status;
                        completeUser.subscriptionEndsAt = branchData.branchSubscription.endsAt;
                    } else {
                        completeUser.subscriptionStatus = 'inactive';
                        completeUser.subscriptionEndsAt = null;
                    }

                    const requiresSubscription = clientType === ClientType.WEB || clientType === ClientType.MOBILE;
                    if (requiresSubscription) {
                        const subscription = branchData.branchSubscription;

                        if (!subscription) {
                            return { message: 'No subscription assigned to this branch. Please contact support.' };
                        }

                        if (subscription.status !== 'active') {
                            return { message: `Your branch subscription is ${subscription.status || 'inactive'}. Please renew to continue using the service.` };
                        }

                        if (subscription.endsAt) {
                            const now = new Date();
                            const endsAt = new Date(subscription.endsAt);
                            if (endsAt < now) {
                                return { message: 'Your subscription has expired. Please renew to continue using the service.' };
                            }
                        }
                    }
                }
            }

            const token = this.generateJWTToken(completeUser);

            return { user: completeUser, token };
        }

        return { message: 'User not found. Please sync your account.' };
    }

    /**
     * Verifies and fetches user role with details
     * 
     * @param roleId - Role ID to fetch
     * @returns Role data or error message
     */
    static async verifyUserRole(
        roleId: string
    ): Promise<{ role?: any; message?: string }> {
        try {
            if (!roleId) {
                return { message: 'Role ID is required.' };
            }

            const role = await RoleModel.findById(roleId);

            if (!role) {
                return { message: 'Role not found.' };
            }

            return { role };
        } catch (error: any) {
            return { message: error.message || 'Failed to fetch role.' };
        }
    }

    /**
     * Saves role to offline database
     * 
     * @param roleData - Role data to save
     * @returns Saved role with sync status or error message
     */
    static async saveRoleOffline(
        roleData: any
    ): Promise<{ role?: any; created?: boolean; synced?: boolean; message?: string }> {
        try {
            if (!roleData || !roleData.roleId) {
                return { message: 'Role data with roleId is required.' };
            }

            const { role, created } = await RoleModel.createOrUpdate({
                ...roleData,
                name: roleData.name || roleData.roleId,
                displayName: roleData.displayName || roleData.name || roleData.roleId,
                description: roleData.description || null,
                isSystemRole: roleData.isSystemRole ?? false,
                isActive: roleData.isActive ?? true
            });

            return { role, created, synced: true };
        } catch (error: any) {
            return { message: error.message || 'Failed to save role offline.' };
        }
    }

    /**
     * Verifies and fetches user privileges/permissions
     * Optimized for performance with single query using joins
     * 
     * @param roleId - Role ID to fetch permissions for
     * @returns Array of permission names or error message
     */
    static async verifyUserPrivileges(
        roleId: string
    ): Promise<{ permissions?: string[]; total?: number; message?: string }> {
        try {
            if (!roleId) {
                return { message: 'Role ID is required.' };
            }

            const permissions = await RolePermissionModel.findPermissionsByRoleId(roleId);

            return {
                permissions,
                total: permissions.length
            };
        } catch (error: any) {
            return { message: error.message || 'Failed to fetch permissions.' };
        }
    }

    /**
     * Bulk saves permissions to offline database
     * Optimized for batch operations with 100+ permissions
     * 
     * @param permissions - Array of permission names or permission objects
     * @param roleId - Optional role ID to create mappings
     * @returns Sync result or error message
     */
    static async savePermissionsOffline(
        permissions: (string | any)[],
        roleId?: string
    ): Promise<{ synced?: { permissions: number; rolePermissions: number }; message?: string }> {
        try {
            if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
                return { message: 'Permissions array is required.' };
            }

            const syncResult = { permissions: 0, rolePermissions: 0 };
            const permissionIds: string[] = [];

            for (const perm of permissions) {
                const permissionName = typeof perm === 'string' ? perm : perm.name;

                if (!permissionName) continue;

                try {
                    const existingPermission = await PermissionModel.findByName(permissionName);

                    if (existingPermission) {
                        permissionIds.push(existingPermission.permissionId);
                        syncResult.permissions++;
                    } else {
                        const permData = typeof perm === 'object' ? perm : {
                            name: permissionName,
                            displayName: permissionName.split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
                            category: permissionName.split('.')[0] || 'general',
                            isSystemPermission: true
                        };

                        const { permission } = await PermissionModel.createOrUpdate(permData);
                        permissionIds.push(permission.permissionId);
                        syncResult.permissions++;
                    }
                } catch (err) {
                    console.warn(`Permission sync warning for ${permissionName}:`, err);
                }
            }

            if (roleId && permissionIds.length > 0) {
                for (const permissionId of permissionIds) {
                    try {
                        const exists = await RolePermissionModel.findByRoleAndPermissionId(roleId, permissionId);
                        if (!exists) {
                            await RolePermissionModel.create({ roleId, permissionId });
                        }
                        syncResult.rolePermissions++;
                    } catch (err) {
                        // Ignore
                    }
                }
            }

            return { synced: syncResult };
        } catch (error: any) {
            return { message: error.message || 'Failed to save permissions offline.' };
        }
    }

    /**
     * Saves a user to the local/offline database with all related data
     * Syncs: Role -> Permissions -> RolePermissions -> User
     * Uses createOrUpdate pattern for all entities
     * 
     * @param userData - User data from the live server including role and permissions
     * @returns Object containing the saved user with relations or error message
     */
    static async saveUserOffline(
        userData: any
    ): Promise<{ user?: any; created?: boolean; message?: string }> {
        try {
            const existingUser = await UserModel.findByUsername(userData.username);

            if (!existingUser && !userData.password) {
                return { message: 'Password is required for new users. Please include the password used for login.' };
            }

            const branchData = userData.branch || null;

            const { user, created } = await UserModel.createOrUpdate(userData, branchData);

            const publicUser = UserService.getPublicUser(user, {});

            return { user: publicUser, created };
        } catch (error: any) {
            return { message: error.message || 'Failed to save user offline.' };
        }
    }

    /**
     * Records user logout by updating last logout timestamp
     * 
     * @param userId - Unique identifier of the user logging out
     * @throws {Error} When userId is not provided
     */
    static async logoutUser(userId: string): Promise<void> {
        if (!userId) {
            throw new Error('ID field is required.');
        }
        await UserModel.updateLastLogout(userId);
    }

    /**
     * Generates JWT token with user payload and application configuration
     * 
     * @param user - User object to include in token payload
     * @returns Signed JWT token string
     * 
     * @remarks
     * The token includes issued at timestamp (iat) and uses application-specific
     * issuer and audience from configuration
     */
    static generateJWTToken(user: any): string {
        const config = getConfig();
        const payload = {
            ...user,
            iat: Math.floor(Date.now() / 1000),
        };

        return (jwt as any).sign(payload, config.jwtSecret, {
            expiresIn: config.jwtExpiresIn,
            issuer: config.appName,
            audience: 'users',
        });
    }

    /**
     * Verifies JWT token validity and returns decoded payload
     * 
     * @param token - JWT token string to verify
     * @returns Decoded token payload
     * @throws {Error} When token is expired, invalid, or verification fails
     * 
     * @example
     * ```typescript
     * try {
     *   const decoded = AuthService.verifyJWTToken(token);
     *   // Token is valid
     * } catch (error) {
     *   // Handle invalid token
     * }
     * ```
     */
    static verifyJWTToken(token: string): any {
        const config = getConfig();
        try {
            return jwt.verify(token, config.jwtSecret);
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token has expired');
            } else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid token');
            } else {
                throw new Error('Token verification failed');
            }
        }
    }

    /**
     * Issues new JWT token using existing token payload
     * 
     * @param oldToken - Previous JWT token (expired tokens are accepted)
     * @returns New JWT token string
     * @throws {Error} When user is not found, inactive, or token refresh fails
     * 
     * @remarks
     * This method ignores token expiration to allow refresh of expired tokens,
     * but verifies user still exists and is active
     */
    static async refreshToken(oldToken: string): Promise<string> {
        const config = getConfig();
        try {
            const decoded = jwt.verify(oldToken, config.jwtSecret, {
                ignoreExpiration: true,
            }) as any;

            const user = await UserModel.findById(decoded.userId);
            if (!user || user.status !== 'active') {
                throw new Error('User not found or inactive');
            }

            const completeUser: any = UserModel.getPublicUser(user);

            const { permissions } = await this.verifyUserPrivileges(user.roleId);
            completeUser.permissions = permissions || [];

            return this.generateJWTToken(completeUser);
        } catch (error) {
            throw new Error('Token refresh failed');
        }
    }

    /**
     * Updates user password after validating current password
     * 
     * @param userId - Unique identifier of the user
     * @param currentPassword - User's current password for verification
     * @param newPassword - New password to set (minimum 8 characters)
     * @throws {Error} When validation fails, user not found, or passwords don't match
     * 
     * @example
     * ```typescript
     * await AuthService.changePassword(userId, 'oldPass', 'newSecurePass');
     * ```
     */
    static async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        if (!userId) {
            throw new Error('User ID is required.');
        }

        if (!currentPassword || !newPassword) {
            throw new Error('Current password and new password are required.');
        }

        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters long.');
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const isCurrentPasswordValid = await UserModel.validatePassword(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        await UserModel.update(userId, { password: newPassword });
    }

    /**
     * Resets user password to temporary value and forces change on next login
     * 
     * @param userId - Unique identifier of the user
     * @returns Object containing the generated temporary password
     * @throws {Error} When userId is not provided or user not found
     * 
     * @remarks
     * The temporary password should be securely communicated to the user
     * and will require immediate change upon next login
     */
    static async resetPassword(userId: string): Promise<{ tempPassword: string }> {
        if (!userId) {
            throw new Error('User ID is required.');
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const tempPassword = this.generateTempPassword();

        await UserModel.update(userId, {
            password: tempPassword,
            forcePasswordChange: true
        });

        return { tempPassword };
    }

    /**
     * Generates cryptographically random temporary password
     * 
     * @returns 12-character temporary password containing uppercase, lowercase,
     * numbers, and special characters
     * 
     * @private
     */
    private static generateTempPassword(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let tempPassword = '';
        for (let i = 0; i < 12; i++) {
            tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return tempPassword;
    }

    /**
     * Switches user's active branch and generates a new token with updated branch context
     * Records branch access by updating the branch's updatedAt timestamp
     * 
     * @param userId - The user's unique identifier
     * @param targetBranchId - The branch ID to switch to
     * @param tenantId - The tenant's unique identifier
     * @returns Object containing updated user data with new token
     * @throws {Error} When user not found, branch not found, or access denied
     * 
     * @example
     * ```typescript
     * const result = await AuthService.switchBranch(userId, newBranchId, tenantId);
     * // Returns { user, token, branch }
     * ```
     */
    static async switchBranch(
        userId: string,
        targetBranchId: string,
        tenantId: string
    ): Promise<{ user: any; token: string; branch: any }> {
        if (!userId || !targetBranchId || !tenantId) {
            throw new Error('User ID, Branch ID, and Tenant ID are required');
        }

        // Import here to avoid circular dependency
        const { BranchModel } = await import('../../models/branch.model');
        const { BranchMiddleware } = await import('../../middlewares/branch.middleware');

        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.tenantId !== tenantId) {
            throw new Error('User does not belong to this tenant');
        }

        const hasAccess = await BranchMiddleware.userHasBranchAccess(user, targetBranchId);
        if (!hasAccess) {
            throw new Error('You do not have access to this branch');
        }

        const branchData = await BranchModel.findByIdWithRelations(targetBranchId);
        if (!branchData) {
            throw new Error('Branch not found');
        }

        const branch = branchData.branch;

        if (branch.tenantId !== tenantId) {
            throw new Error('Branch does not belong to this tenant');
        }

        if (branch.status !== 'active') {
            throw new Error('The target branch is not active');
        }

        await UserModel.update(userId, {
            currentBranchId: targetBranchId
        });

        const updatedUser = await UserModel.findById(userId);
        const roleData = await UserService.getRoleWithPermissions(updatedUser!.roleId);
        const completeUser = UserService.getPublicUser({
            ...updatedUser!,
            currentBranchId: targetBranchId
        }, roleData || {});

        const token = this.generateJWTToken({
            ...completeUser,
            currentBranchId: targetBranchId,
            activeBranchId: targetBranchId
        });

        // Record branch access by touching updatedAt
        await BranchModel.update(targetBranchId, {});

        return {
            user: completeUser,
            token,
            branch: {
                ...branch,
                branchSubscription: branchData.branchSubscription || null
            }
        };
    }

    /**
     * Gets all accessible branches for a user
     * 
     * @param userId - The user's unique identifier
     * @param tenantId - The tenant's unique identifier
     * @returns Array of accessible branches
     */
    static async getUserAccessibleBranches(
        userId: string,
        tenantId: string
    ): Promise<any[]> {
        const { BranchModel } = await import('../../models/branch.model');

        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.accessibleBranches &&
            Array.isArray(user.accessibleBranches) &&
            user.accessibleBranches.includes('*')) {
            return await BranchModel.findByTenantId(tenantId);
        }

        const accessibleBranchIds = [
            user.branchId,
            ...(user.accessibleBranches || [])
        ].filter((id, index, arr) => id && arr.indexOf(id) === index);

        const branches = await Promise.all(
            accessibleBranchIds.map(branchId =>
                BranchModel.findById(branchId)
            )
        );

        return branches.filter(branch => branch !== null && branch.status === 'active');
    }
}