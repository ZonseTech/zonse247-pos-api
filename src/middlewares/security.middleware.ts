/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import validator from 'validator';

export const helmetConfig = helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			scriptSrc: ["'self'"],
			imgSrc: ["'self'", 'data:', 'https:'],
		},
	},
	hsts: {
		maxAge: 31536000,
		includeSubDomains: true,
		preload: true,
	},
});

export const sanitizeInput = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	if (req.body && typeof req.body === 'object') {
		for (const key in req.body) {
			if (typeof req.body[key] === 'string') {
				req.body[key] = validator.escape(req.body[key].trim());
			}
		}
	}

	if (req.query && typeof req.query === 'object') {
		for (const key in req.query) {
			if (typeof req.query[key] === 'string') {
				req.query[key] = validator.escape((req.query[key] as string).trim());
			}
		}
	}

	if (req.params && typeof req.params === 'object') {
		for (const key in req.params) {
			if (typeof req.params[key] === 'string') {
				req.params[key] = validator.escape(req.params[key].trim());
			}
		}
	}

	next();
};

export const preventSQLInjection = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	/* 	const sqlInjectionPatterns = [
			// /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,s
			/('|(\\|;|\/\*|\*\/|--|#))/gi,
			/((%27)|('))((%6F)|o|(%4F))((%72)|r|(%52))/gi,
		]; */

	const sqlInjectionPatterns = [
		/('|(\\|;|\/\*|\*\/|--))/gi,
		/((%27)|('))((%6F)|o|(%4F))((%72)|r|(%52))/gi,
		/#(?!([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})\b)/gi,
	];

	// const checkForSQLInjection = (value: string) => {
	// 	return sqlInjectionPatterns.some((pattern) => {
	// 		pattern.lastIndex = 0;
	// 		return pattern.test(value);
	// 	});
	// };

	// const scanObject = (obj: any) => {
	// 	for (const key in obj) {
	// 		if (typeof obj[key] === 'string') {
	// 			if (checkForSQLInjection(obj[key])) {
	// 				return true;
	// 			}
	// 		} else if (typeof obj[key] === 'object' && obj[key] !== null) {
	// 			if (scanObject(obj[key])) {
	// 				return true;
	// 			}
	// 		}
	// 	}
	// 	return false;
	// };

	// if (scanObject(req.body) || scanObject(req.query) || scanObject(req.params)) {
	// 	res.status(400).json({
	// 		error: 'Security Error',
	// 		message: 'Invalid input detected. Request blocked for security reasons.',
	// 	});
	// 	return;
	// }

	next();
};

export const preventXSS = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const xssPatterns = [
		/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
		/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
		/javascript:/gi,
		/on\w+\s*=/gi,
	];

	const checkForXSS = (value: string) => {
		return xssPatterns.some((pattern) => {
			pattern.lastIndex = 0; // Reset regex state before each test
			return pattern.test(value);
		});
	};

	const scanObject = (obj: any) => {
		for (const key in obj) {
			if (typeof obj[key] === 'string') {
				if (checkForXSS(obj[key])) {
					return true;
				}
			} else if (typeof obj[key] === 'object' && obj[key] !== null) {
				if (scanObject(obj[key])) {
					return true;
				}
			}
		}
		return false;
	};

	if (scanObject(req.body) || scanObject(req.query) || scanObject(req.params)) {
		res.status(400).json({
			error: 'Security Error',
			message:
				'Potentially malicious content detected. Request blocked for security reasons.',
		});
		return;
	}

	next();
};

export const limitRequestSize = (maxSize = '10mb') => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const contentLength = req.headers['content-length'];

		if (contentLength) {
			const sizeInBytes = parseInt(contentLength);
			const maxSizeInBytes = parseSize(maxSize);

			if (sizeInBytes > maxSizeInBytes) {
				res.status(413).json({
					error: 'Request Too Large',
					message: `Request size exceeds the maximum allowed size of ${maxSize}`,
				});
				return;
			}
		}

		next();
	};
};

const parseSize = (size: string): number => {
	const units: { [key: string]: number } = {
		b: 1,
		kb: 1024,
		mb: 1024 * 1024,
		gb: 1024 * 1024 * 1024,
	};

	const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
	if (!match) return 0;

	const [, value, unit] = match;
	return parseFloat(value) * (units[unit] || 0);
};
