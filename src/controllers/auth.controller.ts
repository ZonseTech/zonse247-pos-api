import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services/auth/auth.service';
import { PublicUser } from 'users';
import { ApiResponse } from 'network';
import { AuthRequest } from '../lib/express.type';

/**
 * Authentication Controller
 * Handles user authentication, authorization, and token management
 * @class AuthController
 * @extends BaseController
 */
export class AuthController extends BaseController {
    constructor() {
        super();
    }

    /**
     * User Login
     * Authenticates user credentials and returns JWT token
     * @static
     * @param req - Express request with username and password in body
     * @param res - Express response
     * @returns Promise<void>
     */
    static async login(
        req: Request<ApiResponse<{ user: PublicUser; token: string }>, { username: string; password: string }>,
        res: Response
    ): Promise<void> {
        try {
            const { username, password } = req.body;
            const clientType = (req.headers['x-client-type'] as 'web' | 'mobile' | 'desktop') || 'desktop';

            if (!username || !password) {
                BaseController.sendResponse(res, 400, false, 'Username and password are required');
                return;
            }

            const result = await AuthService.loginUser(username, password, clientType);

            if (result.message) {
                BaseController.sendResponse(res, 401, false, result.message);
            } else {
                BaseController.sendResponse(res, 200, true, 'Login successful', {
                    user: result.user,
                    token: result.token
                });
            }
        } catch (error: any) {
            BaseController.sendResponse(res, 500, false, 'Incorrect user credentials.', undefined, error.message);
        }
    }

    /**
     * Save User Offline
     * Saves user data to local database for offline authentication
     * @static
     * @param req - Express request with user data in body
     * @param res - Express response
     * @returns Promise<void>
     */
    static async saveUserOffline(
        req: Request<ApiResponse<{ user: PublicUser }>, any>,
        res: Response
    ): Promise<void> {
        try {
            const userData = req.body;

            if (!userData || !userData.username) {
                BaseController.sendResponse(res, 400, false, 'User data with username is required');
                return;
            }

            const result = await AuthService.saveUserOffline(userData);

            if (result.message) {
                BaseController.sendResponse(res, 400, false, result.message);
            } else {
                const message = result.created ? 'User created offline successfully' : 'User updated offline successfully';
                BaseController.sendResponse(res, 200, true, message, {
                    user: result.user,
                    created: result.created
                });
            }
        } catch (error: any) {
            console.error('Error saving user offline:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to save user offline.', undefined, error.message);
        }
    }

    /**
     * Verify User Role
     * Fetches the specific user role by roleId
     * @static
     * @param req - Express request with roleId in query/params
     * @param res - Express response
     * @returns Promise<void>
     */
    static async verifyingRoles(
        req: Request & { auth?: any },
        res: Response
    ): Promise<void> {
        try {
            const roleId = req.query.roleId as string || req.auth?.roleId;

            if (!roleId) {
                BaseController.sendResponse(res, 400, false, 'Role ID is required');
                return;
            }

            const result = await AuthService.verifyUserRole(roleId);

            if (result.message) {
                BaseController.sendResponse(res, 404, false, result.message);
            } else {
                BaseController.sendResponse(res, 200, true, 'Role fetched successfully', {
                    role: result.role
                });
            }
        } catch (error: any) {
            console.error('Error fetching role:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch role.', undefined, error.message);
        }
    }

    /**
     * Save Role Offline
     * Saves role data to local database for offline use
     * @static
     * @param req - Express request with role data in body
     * @param res - Express response
     * @returns Promise<void>
     */
    static async saveRoleOffline(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const roleData = req.body;

            if (!roleData || !roleData.roleId) {
                BaseController.sendResponse(res, 400, false, 'Role data with roleId is required');
                return;
            }

            const result = await AuthService.saveRoleOffline(roleData);

            if (result.message) {
                BaseController.sendResponse(res, 400, false, result.message);
            } else {
                const message = result.created ? 'Role created offline successfully' : 'Role updated offline successfully';
                BaseController.sendResponse(res, 200, true, message, {
                    role: result.role,
                    created: result.created,
                    synced: result.synced
                });
            }
        } catch (error: any) {
            BaseController.sendResponse(res, 500, false, 'Failed to save role offline.', undefined, error.message);
        }
    }

    /**
     * Verify User Privileges
     * Fetches all permissions for a specific role - optimized for 100+ permissions
     * @static
     * @param req - Express request with roleId in query/params
     * @param res - Express response
     * @returns Promise<void>
     */
    static async verifyingPrivileges(
        req: Request & { auth?: any },
        res: Response
    ): Promise<void> {
        try {
            const roleId = req.query.roleId as string || req.auth?.roleId;

            if (!roleId) {
                BaseController.sendResponse(res, 400, false, 'Role ID is required');
                return;
            }

            const result = await AuthService.verifyUserPrivileges(roleId);

            if (result.message) {
                BaseController.sendResponse(res, 404, false, result.message);
            } else {
                BaseController.sendResponse(res, 200, true, 'Permissions fetched successfully', {
                    permissions: result.permissions,
                    total: result.total
                });
            }
        } catch (error: any) {
            console.error('Error fetching permissions:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch permissions.', undefined, error.message);
        }
    }

    /**
     * Save Permissions Offline
     * Bulk saves permissions to local database - handles 100+ permissions efficiently
     * @static
     * @param req - Express request with permissions array and optional roleId in body
     * @param res - Express response
     * @returns Promise<void>
     */
    static async savePermissionsOffline(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const { permissions, roleId } = req.body;

            if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
                BaseController.sendResponse(res, 400, false, 'Permissions array is required');
                return;
            }

            const result = await AuthService.savePermissionsOffline(permissions, roleId);

            if (result.message) {
                BaseController.sendResponse(res, 400, false, result.message);
            } else {
                BaseController.sendResponse(res, 200, true, 'Permissions saved offline successfully', {
                    synced: result.synced
                });
            }
        } catch (error: any) {
            console.error('Error saving permissions offline:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to save permissions offline.', undefined, error.message);
        }
    }

    /**
     * User Logout
     * Logs out a specific user by invalidating their session/token
     * @static
     * @param req - Express request with user ID in params
     * @param res - Express response
     * @returns Promise<void>
     */
    static async logout(req: Request<{ userId: string }>, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            if (!userId) {
                BaseController.sendResponse(res, 400, false, 'User ID is required');
                return;
            }

            await AuthService.logoutUser(userId);
            BaseController.sendResponse(res, 200, true, 'User logged out successfully');
        } catch (error: any) {
            console.error('Error during logout:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Refresh JWT Token
     * Generates a new JWT token using the current valid token
     * @static
     * @param req - Express request with current token in body
     * @param res - Express response
     * @returns Promise<void>
     */
    static async refreshToken(
        req: Request<ApiResponse<{ token: string }>, { token: string }>,
        res: Response
    ): Promise<void> {
        try {
            const { token } = req.body;

            if (!token) {
                BaseController.sendResponse(res, 400, false, 'Token is required');
                return;
            }

            const newToken = await AuthService.refreshToken(token);
            BaseController.sendResponse(res, 200, true, 'Token refreshed successfully', { token: newToken });
        } catch (error: any) {
            console.error('Error refreshing token:', error);

            let statusCode = 401;
            if (error.message.includes('not found') || error.message.includes('inactive')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Verify JWT Token
     * Validates JWT token and returns decoded user information
     * @static
     * @param req - Express request with token in headers
     * @param res - Express response
     * @returns Promise<void>
     */
    static async verifyToken(
        req: Request<ApiResponse<{ user: any }>, { authorization?: string; 'x-access-token'?: string }>,
        res: Response
    ): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '') ||
                req.headers['x-access-token'];

            if (!token) {
                BaseController.sendResponse(res, 400, false, 'Token is required');
                return;
            }

            const decoded = AuthService.verifyJWTToken(token as string);
            BaseController.sendResponse(res, 200, true, 'Token is valid', { user: decoded });
        } catch (error: any) {
            console.error('Error verifying token:', error);

            let statusCode = 401;
            if (error.message.includes('expired')) {
                statusCode = 401;
            } else if (error.message.includes('Invalid')) {
                statusCode = 401;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Change User Password
     * Changes password for authenticated user after verifying current password
     * @static
     * @param req - Express request with user ID in params and passwords in body
     * @param res - Express response
     * @returns Promise<void>
     */
    static async changePassword(
        req: Request<{ userId: string }, ApiResponse<{ status: boolean }>, { currentPassword: string; newPassword: string }>,
        res: Response
    ): Promise<void> {
        try {
            const { userId } = req.params;
            const { currentPassword, newPassword } = req.body;

            if (!userId) {
                BaseController.sendResponse(res, 400, false, 'User ID is required');
                return;
            }

            if (!currentPassword || !newPassword) {
                BaseController.sendResponse(res, 400, false, 'Current password and new password are required');
                return;
            }

            await AuthService.changePassword(userId, currentPassword, newPassword);
            BaseController.sendResponse(res, 200, true, 'Password changed successfully', { status: true });
        } catch (error: any) {
            console.error('Error changing password:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('incorrect') || error.message.includes('invalid')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Reset User Password
     * Administrative function to reset user password (typically sends reset email)
     * @static
     * @param req - Express request with user ID in params
     * @param res - Express response
     * @returns Promise<void>
     */
    static async resetPassword(req: Request<{ userId: string }>, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            if (!userId) {
                BaseController.sendResponse(res, 400, false, 'User ID is required');
                return;
            }

            const result = await AuthService.resetPassword(userId);
            BaseController.sendResponse(res, 200, true, 'Password reset successfully', result);
        } catch (error: any) {
            console.error('Error resetting password:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Switch User's Active Branch
     * Allows authenticated users to switch their active branch context
     * Records branch access by updating the branch's updatedAt timestamp
     * @static
     * @param req - Express request with branchId in body and authenticated user
     * @param res - Express response
     * @returns Promise<void>
     */
    static async switchBranch(
        req: Request<ApiResponse<{ user: PublicUser; token: string; branch: any }>, { branchId: string }> & AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { branchId } = req.body;
            const user = req.auth;
            const clientType = (req.headers['x-client-type'] as 'web' | 'mobile' | 'desktop') || 'desktop';

            if (!user) {
                BaseController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!branchId) {
                BaseController.sendResponse(res, 400, false, 'Branch ID is required');
                return;
            }

            const result = await AuthService.switchBranch(user.userId, branchId, user.tenantId, clientType);

            res.setHeader('X-Active-Branch-Id', branchId);

            BaseController.sendResponse(res, 200, true, 'Branch switched successfully', {
                user: result.user,
                token: result.token,
                branch: result.branch
            });
        } catch (error: any) {
            console.error('Error switching branch:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('do not have access') || error.message.includes('not active')) {
                statusCode = 403;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Get User's Accessible Branches
     * Returns all branches the authenticated user can access
     * @static
     * @param req - Express request with authenticated user
     * @param res - Express response
     * @returns Promise<void>
     */
    static async getAccessibleBranches(
        req: Request & AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const user = req.auth;

            if (!user) {
                BaseController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            const branches = await AuthService.getUserAccessibleBranches(user.userId, user.tenantId);

            BaseController.sendResponse(res, 200, true, 'Accessible branches retrieved successfully', {
                branches,
                currentBranchId: user.currentBranchId || user.branchId
            });
        } catch (error: any) {
            console.error('Error getting accessible branches:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}