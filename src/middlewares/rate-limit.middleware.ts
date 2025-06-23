import { Request } from 'express';
import { rateLimit } from 'express-rate-limit';

export const generalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	message: {
		error: 'Rate Limit Exceeded',
		message: 'Too many requests from this IP, please try again later.',
		retryAfter: '15 minutes',
	},
	standardHeaders: true,
	legacyHeaders: false,
});

export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: {
		error: 'Rate Limit Exceeded',
		message:
			'Too many authentication attempts from this IP, please try again later.',
		retryAfter: '15 minutes',
	},
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: true,
});

export const createAccountLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 7,
	message: {
		error: 'Rate Limit Exceeded',
		message: 'Too many accounts created from this IP, please try again later.',
		retryAfter: '1 hour',
	},
	standardHeaders: true,
	legacyHeaders: false,
});

export const passwordResetLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 3,
	message: {
		error: 'Rate Limit Exceeded',
		message:
			'Too many password reset attempts from this IP, please try again later.',
		retryAfter: '1 hour',
	},
	standardHeaders: true,
	legacyHeaders: false,
});

export const createUserSpecificLimiter = (
	windowMs: number,
	max: number,
	message: string
) => {
	return rateLimit({
		windowMs,
		max,
		message: {
			error: 'Rate Limit Exceeded',
			message,
			retryAfter: `${windowMs / 1000 / 60} minutes`,
		},
		standardHeaders: true,
		legacyHeaders: false,
		keyGenerator: (req: Request) => {
			return req.auth?.uuid || req.ip;
		},
	});
};
