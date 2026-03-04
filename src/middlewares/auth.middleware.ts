import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from 'users';
import { getConfig } from '../config/app.config';

interface AuthRequest extends Request {
	auth?: User;
}

export class AuthMiddleware {
	private getJwtConfig() {
		const config = getConfig();
		return {
			secret: config.jwtSecret,
			expiresIn: config.jwtExpiresIn,
			refreshExpiresIn: config.jwtRefreshExpiresIn,
			refreshSecret: config.jwtRefreshSecret,
		};
	}

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
			const decoded = jwt.verify(token, this.getJwtConfig().secret);
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

		const userId = req.params.userId || req.params.id;
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

	extractUserFromToken = (req: Request): any | null => {
		const token =
			req.headers.authorization?.replace('Bearer ', '') ||
			(req.headers['x-access-token'] as string);

		if (!token) return null;

		try {
			return jwt.verify(token, this.getJwtConfig().secret);
		} catch (error) {
			return null;
		}
	};
}