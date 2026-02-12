import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services/auth.service';
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

            if (!username || !password) {
                BaseController.sendResponse(res, 400, false, 'Username and password are required');
                return;
            }

            const result = await AuthService.loginUser(username, password);

            if (result.message) {
                BaseController.sendResponse(res, 401, false, result.message);
            } else {
                BaseController.sendResponse(res, 200, true, 'Login successful', {
                    user: result.user,
                    token: result.token
                });
            }
        } catch (error: any) {
            console.error('Error during login:', error);
            BaseController.sendResponse(res, 500, false, 'Incorrect user credentials.', undefined, error.message);
        }
    }

    /**
     * User Login
     * Authenticates user credentials and returns JWT token
     * @static
     * @param req - Express request with username and password in body
     * @param res - Express response
     * @returns Promise<void>
     */
    static async initiateLoginAccount(
        req: Request<ApiResponse<{ user: PublicUser; token: string }>, { username: string; password: string }>,
        res: Response
    ): Promise<void> {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                BaseController.sendResponse(res, 400, false, 'Username and password are required');
                return;
            }

            const result = await AuthService.initiateLoginAccount(username, password);

            if (result.message) {
                BaseController.sendResponse(res, 401, false, result.message);
            } else {
                BaseController.sendResponse(res, 200, true, 'Login successful', {
                    user: result.user,
                    token: result.token
                });
            }
        } catch (error: any) {
            console.error('Error during login:', error);
            BaseController.sendResponse(res, 500, false, 'Incorrect user credentials.', undefined, error.message);
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

            if (!user) {
                BaseController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            if (!branchId) {
                BaseController.sendResponse(res, 400, false, 'Branch ID is required');
                return;
            }

            const result = await AuthService.switchBranch(user.userId, branchId, user.tenantId);

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