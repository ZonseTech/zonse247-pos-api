import jwt from 'jsonwebtoken';
import config from '../config';
import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../controllers/base.controller';
import { User } from 'users';
import { Config } from 'config';

interface AuthRequest extends Request {
	auth?: User;
}

export class AuthMiddleware {
	private config: Config;

	constructor() {
		this.config = config;
	}

	verifyRequestHeaders = (
		req: Request,
		res: Response,
		next: NextFunction
	): void => {
		try {
			const tenantSignature = req.headers['x-tenant-signature'] as string | undefined;

			if (!tenantSignature || tenantSignature.trim() === '') {
				return BaseController.sendResponseWithSubscription(
					res,
					400,
					false,
					'Application not verified. Please verify your application before using the system.',
					'unknown',
					null
				);
			}

			req.headers['x-tenant-signature'] = tenantSignature.trim();

			next();
		} catch (error) {
			let message = 'Authentication failed. Please check your token and try again.';

			if (error instanceof jwt.TokenExpiredError) {
				message = 'Authentication failed: token has expired.';
			} else if (error instanceof jwt.JsonWebTokenError) {
				message = 'Authentication failed: invalid token format.';
			}

			res.status(401).json({
				success: false,
				error: 'Authentication Error',
				message,
			});
		}
	};

	verifyToken = (req: Request & AuthRequest, res: Response, next: NextFunction): void => {
		const token =
			req.headers.authorization?.replace('Bearer ', '') ||
			(req.headers['x-access-token'] as string);

		if (!token) {
			res.status(401).json({
				error: 'Authentication Error',
				message: 'Access token is required',
			});
			return;
		}

		try {
			const decoded = jwt.verify(token, this.config.jwt.secret);
			req.auth = decoded as User;
			next();
		} catch (error) {
			let message = 'Invalid or expired token';

			if (error instanceof jwt.TokenExpiredError) {
				message = 'Token has expired';
			} else if (error instanceof jwt.JsonWebTokenError) {
				message = 'Invalid token format';
			}

			res.status(401).json({
				error: 'Authentication Error',
				message: message,
			});
		}
	};

	verifyOwnership = (req: Request, res: Response, next: NextFunction): void => {
		const user = this.extractUserFromToken(req)

		const userId = req.params.userId;
		const requestingUserId = user?.userId;
		const userRole = user?.roleId;

		if (!requestingUserId) {
			res.status(401).json({
				error: 'Authentication Error',
				message: 'User information not found in token',
			});
			return;
		}

		if (userRole === 'admin' || userRole === 'super-admin' || requestingUserId === userId) {
			next();
			return;
		}

		res.status(403).json({
			error: 'Authorization Error',
			message: 'You are not authorized to access this resource',
		});
	};

	requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
		const user = this.extractUserFromToken(req)
		const userRole = user?.roleId;

		if (userRole === 'admin' || userRole === 'super-admin') {
			next();
			return;
		}

		res.status(403).json({
			error: 'Authorization Error',
			message: 'Admin access required',
		});
	};

	verifyPasswordStrength = (
		req: Request,
		res: Response,
		next: NextFunction
	): void => {
		const { password } = req.body;

		if (!password) {
			next();
			return;
		}

		const minLength = 8;
		const hasUpperCase = /[A-Z]/.test(password);
		const hasLowerCase = /[a-z]/.test(password);
		const hasNumbers = /\d/.test(password);
		const hasSpecialChar = /[@$!%*?&]/.test(password);

		const errors: string[] = [];

		if (password.length < minLength) {
			errors.push(`Password must be at least ${minLength} characters long`);
		}
		if (!hasUpperCase) {
			errors.push('Password must contain at least one uppercase letter');
		}
		if (!hasLowerCase) {
			errors.push('Password must contain at least one lowercase letter');
		}
		if (!hasNumbers) {
			errors.push('Password must contain at least one number');
		}
		if (!hasSpecialChar) {
			errors.push(
				'Password must contain at least one special character (@$!%*?&)'
			);
		}

		if (errors.length > 0) {
			res.status(400).json({
				error: 'Password Validation Error',
				message: 'Password does not meet security requirements',
				details: errors,
			});
			return;
		}

		next();
	};

	extractUserFromToken = (req: Request): any | null => {
		const token =
			req.headers.authorization?.replace('Bearer ', '') ||
			(req.headers['x-access-token'] as string);

		if (!token) return null;

		try {
			return jwt.verify(token, this.config.jwt.secret);
		} catch (error) {
			return null;
		}
	};
}