import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

declare module 'express' {
	interface Request {
		user?: any;
	}
}

export interface AuthConfig {
	jwtSecret: string;
	jwtExpiresIn: string;
}

export class AuthMiddleware {
	private config: AuthConfig;

	constructor(config: AuthConfig) {
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
			const decoded = jwt.verify(token, this.config.jwtSecret);
			req.user = decoded;
			next();
		} catch (error) {
			res.status(401).json({
				error: 'Authentication Error',
				message: 'Invalid or expired token',
			});
		}
	};

	verifyOwnership = (req: Request, res: Response, next: NextFunction): void => {
		const userId = req.params.userId;
		const requestingUserId = req.user?.uuid;
		const userRole = req.user?.role;

		if (!requestingUserId) {
			res.status(401).json({
				error: 'Authentication Error',
				message: 'User information not found in token',
			});
			return;
		}

		if (userRole === 'admin' || requestingUserId === userId) {
			next();
			return;
		}

		res.status(403).json({
			error: 'Authorization Error',
			message: 'You are not authorized to access this resource',
		});
	};

	requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
		const userRole = req.user?.role;

		if (userRole !== 'admin') {
			res.status(403).json({
				error: 'Authorization Error',
				message: 'Admin access required',
			});
			return;
		}

		next();
	};

	generateToken = (user: any): string => {
		const payload = {
			uuid: user.uuid,
			username: user.username,
			email: user.email,
			role: user.role || 'user',
		};

		return (jwt as any).sign(payload, this.config.jwtSecret, {
			expiresIn: this.config.jwtExpiresIn,
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
}
