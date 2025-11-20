import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services/auth.service';
import { PublicUser } from 'users';
import { ApiResponse } from 'network';

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
            BaseController.sendResponse(res, 500, false, 'An unexpected error occurred during login', undefined, error.message);
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
    static async logout(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                BaseController.sendResponse(res, 400, false, 'User ID is required');
                return;
            }

            await AuthService.logoutUser(id);
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
        req: Request<{ id: string }, ApiResponse<{ status: boolean }>, { currentPassword: string; newPassword: string }>,
        res: Response
    ): Promise<void> {
        try {
            const { id } = req.params;
            const { currentPassword, newPassword } = req.body;

            if (!id) {
                BaseController.sendResponse(res, 400, false, 'User ID is required');
                return;
            }

            if (!currentPassword || !newPassword) {
                BaseController.sendResponse(res, 400, false, 'Current password and new password are required');
                return;
            }

            await AuthService.changePassword(id, currentPassword, newPassword);
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
    static async resetPassword(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                BaseController.sendResponse(res, 400, false, 'User ID is required');
                return;
            }

            const result = await AuthService.resetPassword(id);
            BaseController.sendResponse(res, 200, true, 'Password reset successfully', result);
        } catch (error: any) {
            console.error('Error resetting password:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}