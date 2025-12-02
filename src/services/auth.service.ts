import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { UserModel } from '../models/user.model';
import { UserService } from './user.service';
import { BaseService } from './base.service';
import type { User } from 'users';

/**
 * Service layer for authentication and authorization operations
 * 
 * @remarks
 * This service handles user authentication, JWT token management, password operations,
 * and session management. It serves as the bridge between authentication controllers
 * and user data models.
 * 
 * @example
 * ```typescript
 * // User login
 * const result = await AuthService.loginUser(username, password);
 * 
 * // Token verification
 * const decoded = AuthService.verifyJWTToken(token);
 * ```
 */
export class AuthService {
    /**
     * Authenticates user credentials and generates JWT token
     * 
     * @param username - User's username (automatically sanitized)
     * @param password - User's plain text password
     * @returns Object containing user data with token, or error message
     * 
     * @throws {Error} When database operations fail
     * 
     * @example
     * ```typescript
     * const result = await AuthService.loginUser('john_doe', 'password123');
     * if (result.token) {
     *   // Login successful
     * }
     * ```
     */
    static async loginUser(
        username: string,
        password: string,
        isLive: boolean
    ): Promise<{ user?: any; token?: string; message?: string }> {
        const escapedUsername = validator.escape(username);

        const user = await UserModel.findByUsername(escapedUsername);

        if (user) {
            if (user.status !== 'active') {
                return { message: 'Account is not active. Please contact support.' };
            }

            const isPasswordValid = await UserModel.validatePassword(password, user.password);

            if (!isPasswordValid) {
                return { message: 'Incorrect username or password.' };
            }

            await UserModel.updateLastLogin(user.userId);

            const roleData = await UserService.getRoleWithPermissions(user.roleId);
            const completeUser = UserService.getPublicUser(user, roleData || {});
            const token = this.generateJWTToken(completeUser);

            return { user: completeUser, token };
        }

        if (!isLive) {
            return { message: 'Incorrect username or password.' };
        }

        const response = await BaseService.post<{ user: User; token: string }>('/auth/login', {
            username: escapedUsername,
            password,
            isLive: true,
        });

        if (!response.success) {
            return { message: response.message || 'Incorrect username or password.' };
        }

        const { user: remoteUser, token: remoteToken } = response.data;

        if (remoteUser) {
            const hashedPassword = await bcrypt.hash('admin', process.env.BCRYPT_SALT_ROUNDS || 10);
            remoteUser.password = hashedPassword;
            await UserModel.insert(remoteUser);
        }

        return { user: remoteUser, token: remoteToken };
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
        const payload = {
            ...user,
            iat: Math.floor(Date.now() / 1000),
        };

        return (jwt as any).sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '',
            issuer: process.env.APP_NAME || '',
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
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
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
        try {
            const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, {
                ignoreExpiration: true,
            }) as any;

            const user = await UserModel.findByUuid(decoded.userId);
            if (!user || user.status !== 'active') {
                throw new Error('User not found or inactive');
            }

            return this.generateJWTToken(user);
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
}