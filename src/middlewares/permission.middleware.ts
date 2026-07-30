import { Request, Response, NextFunction } from 'express';
import { User } from 'users';

interface AuthRequest extends Request {
	auth?: User;
}

export class PermissionMiddleware {
	requirePermission = (permission: string) => (req: Request & AuthRequest, res: Response, next: NextFunction): void => {
		const userPermissions = req.auth?.permissions ?? [];

		if (!userPermissions.includes(permission)) {
			res.status(403).json({
				error: 'Authorization Error',
				message: `Missing required permission: ${permission}`,
			});
			return;
		}

		next();
	};

	requireAnyPermission = (permissions: string[]) => (req: Request & AuthRequest, res: Response, next: NextFunction): void => {
		const userPermissions = req.auth?.permissions ?? [];

		if (!permissions.some((permission) => userPermissions.includes(permission))) {
			res.status(403).json({
				error: 'Authorization Error',
				message: `Missing required permission (any of): ${permissions.join(', ')}`,
			});
			return;
		}

		next();
	};
}
