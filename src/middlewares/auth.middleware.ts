import jwt from 'jsonwebtoken';
import config, { Config } from '../config';
import { Request, Response, NextFunction } from 'express';

declare module 'express' {
	interface Request {
		auth?: User;
	}
}

export class AuthMiddleware {
	private config: Config;

	constructor() {
		this.config = config;
	}

	verifyToken = (req: Request, res: Response, next: NextFunction): void => {
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
		const requestingUserId = user?.uuid;
		const userRole = user?.roleUuid;

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
		const userRole = user?.roleUuid;

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