import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config/app.config';

export interface AppError extends Error {
	statusCode?: number;
	code?: string;
	details?: any;
	isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
	statusCode: number;
	code: string;
	details: any;
	isOperational: boolean;

	constructor(
		message: string,
		statusCode = 500,
		code = 'INTERNAL_ERROR',
		details: any = null
	) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
		this.details = details;
		this.isOperational = true;

		Error.captureStackTrace(this, this.constructor);
	}
}

export const asyncHandler = (fn) => {
	return (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
};

export const notFoundHandler = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const error = new CustomError(
		`Route ${req.originalUrl} not found`,
		404,
		'ROUTE_NOT_FOUND'
	);
	next(error);
};

export const globalErrorHandler = (
	error: AppError,
	req: Request,
	res: Response
): void => {
	let statusCode = error.statusCode || 500;
	let message = error.message || 'Internal Server Error';
	let code = error.code || 'INTERNAL_ERROR';
	let details = error.details || null;

	console.error('Error occurred:', {
		message: error.message,
		stack: error.stack,
		url: req.originalUrl,
		method: req.method,
		ip: req.ip,
		userAgent: req.get('User-Agent'),
		timestamp: new Date().toISOString(),
	});

	if (error.name === 'ValidationError') {
		statusCode = 400;
		code = 'VALIDATION_ERROR';
		message = 'Validation failed';
	} else if (error.name === 'UnauthorizedError') {
		statusCode = 401;
		code = 'UNAUTHORIZED';
		message = 'Authentication required';
	} else if (error.name === 'JsonWebTokenError') {
		statusCode = 401;
		code = 'INVALID_TOKEN';
		message = 'Invalid authentication token';
	} else if (error.name === 'TokenExpiredError') {
		statusCode = 401;
		code = 'TOKEN_EXPIRED';
		message = 'Authentication token has expired';
	} else if (error.name === 'CastError') {
		statusCode = 400;
		code = 'INVALID_ID';
		message = 'Invalid resource identifier';
	} else if (error.name === 'MongoError' && parseInt(error.code) === 11000) {
		statusCode = 409;
		code = 'DUPLICATE_RESOURCE';
		message = 'Resource already exists';
	}

	if (getConfig().nodeEnv === 'production' && !error.isOperational) {
		message = 'Something went wrong';
		details = null;
	}

	res.status(statusCode).json({
		error: code,
		message,
		...(details && { details }),
		...(getConfig().nodeEnv === 'development' && { stack: error.stack }),
	});
};

export const timeoutHandler = (timeout = 30000) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const timer = setTimeout(() => {
			const error = new CustomError('Request timeout', 408, 'REQUEST_TIMEOUT');
			next(error);
		}, timeout);

		res.on('finish', () => {
			clearTimeout(timer);
		});

		res.on('close', () => {
			clearTimeout(timer);
		});

		next();
	};
};

export const handleDatabaseError = (error: any): AppError => {
	if (error.code === 'ECONNREFUSED') {
		return new CustomError(
			'Database connection failed',
			503,
			'DATABASE_CONNECTION_ERROR'
		);
	}

	if (error.code === 'ENOTFOUND') {
		return new CustomError(
			'Database host not found',
			503,
			'DATABASE_HOST_ERROR'
		);
	}

	return new CustomError(
		'Database operation failed',
		500,
		'DATABASE_ERROR',
		error.message
	);
};
