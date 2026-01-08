import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { AuthRequest } from '../lib/express.type';
import { getConfig } from '../config/app.config';

morgan.token('user', (req: Request & AuthRequest) => {
	return req.auth ? `User:${req.auth?.username}(${req?.auth?.userId})` : 'Anonymous';
});

morgan.token('request-id', (req: Request) => {
	return (req.headers['x-request-id'] as string) || 'N/A';
});

morgan.token('response-time-formatted', (req: Request, res: Response) => {
	const responseTime = morgan['response-time'](req, res);
	return responseTime ? `${parseFloat(responseTime).toFixed(2)}ms` : 'N/A';
});

export const developmentLogger = morgan('dev');

export const productionLogger = morgan(
	':remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-formatted :request-id',
	{
		skip: (req: Request) => {
			return req.url === '/' || req.url === '/health';
		},
	}
);

export const securityLogger = (
	req: Request & AuthRequest,
	res: Response,
	next: NextFunction
): void => {
	const originalSend = res.send;

	res.send = function (data: any) {
		if (res.statusCode === 401 || res.statusCode === 403) {
			console.warn('SECURITY EVENT:', {
				timestamp: new Date().toISOString(),
				event:
					res.statusCode === 401 ? 'UNAUTHORIZED_ACCESS' : 'FORBIDDEN_ACCESS',
				ip: req.ip,
				userAgent: req.get('User-Agent'),
				url: req.originalUrl,
				method: req.method,
				user: req.auth?.username || 'Anonymous',
				headers: {
					authorization: req.headers.authorization ? '[REDACTED]' : 'None',
					'x-forwarded-for': req.headers['x-forwarded-for'],
				},
			});
		}

		if (req.path === '/login' && res.statusCode !== 200) {
			console.warn('FAILED LOGIN ATTEMPT:', {
				timestamp: new Date().toISOString(),
				ip: req.ip,
				userAgent: req.get('User-Agent'),
				username: req.body?.username || 'Unknown',
				statusCode: res.statusCode,
			});
		}

		return originalSend.call(this, data);
	};

	next();
};

export const requestTracker = (
	req: Request & AuthRequest,
	res: Response,
	next: NextFunction
): void => {
	if (!req.headers['x-request-id']) {
		req.headers['x-request-id'] = `req_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
	}

	req.requestStartTime = Date.now();

	if (getConfig().nodeEnv === 'development') {
		console.log(
			`[${req.headers['x-request-id']}] ${req.method} ${req.url} - Request started`
		);
	}

	res.on('finish', () => {
		const duration = Date.now() - req.requestStartTime;

		if (getConfig().nodeEnv === 'development') {
			console.log(
				`[${req.headers['x-request-id']}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`
			);
		}

		if (duration > 2000) {
			console.warn('SLOW REQUEST:', {
				requestId: req.headers['x-request-id'],
				method: req.method,
				url: req.url,
				duration: `${duration}ms`,
				statusCode: res.statusCode,
				user: req.auth?.username || 'Anonymous',
			});
		}
	});

	next();
};

export const apiAnalytics = (
	req: Request & AuthRequest,
	res: Response,
	next: NextFunction
): void => {
	const originalSend = res.send;

	res.send = function (data: any) {
		const analyticsData = {
			timestamp: new Date().toISOString(),
			endpoint: req.route?.path || req.url,
			method: req.method,
			statusCode: res.statusCode,
			userId: req.auth?.userId || null,
			userAgent: req.get('User-Agent'),
			ip: req.ip,
			responseSize: JSON.stringify(data).length,
			duration: Date.now() - req.requestStartTime,
		};

		if (getConfig().enableAnalytics) {
			console.log('API_ANALYTICS:', analyticsData);
		}

		return originalSend.call(this, data);
	};

	next();
};

export const errorLogger = (
	error: Error,
	req: Request & AuthRequest,
	res: Response,
	next: NextFunction
): void => {
	const errorLog = {
		timestamp: new Date().toISOString(),
		error: {
			name: error.name,
			message: error.message,
			stack: error.stack,
		},
		request: {
			id: req.headers['x-request-id'],
			method: req.method,
			url: req.originalUrl,
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			user: req.auth?.username || 'Anonymous',
		},
	};

	console.error('APPLICATION ERROR:', errorLog);

	// In production, you might want to send this to an error tracking service
	// like Sentry, Rollbar, etc.

	next(error);
};
