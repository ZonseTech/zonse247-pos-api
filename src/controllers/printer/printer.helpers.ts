/**
 * Printer Controller Helpers
 * Shared utilities for printer controllers
 */

import { Request, Response } from 'express';
import { BaseController } from '../base.controller';
import { AuthRequest } from '../../lib/express.type';
import { AppPlatform } from '../../types/printer.platform';
import { PrinterError } from '../../utils/errors/printer.error';

/**
 * Request type with auth context
 */
export type AuthenticatedRequest<P = Record<string, string>> = Request<P> & AuthRequest;

/**
 * Detect platform from request headers
 */
export function detectPlatform(req: Request): AppPlatform {
    const userAgent = req.headers['user-agent'] || '';
    const platformHeader = req.headers['x-platform'] as string;

    if (platformHeader) {
        const platform = platformHeader.toUpperCase();
        if (Object.values(AppPlatform).includes(platform as AppPlatform)) {
            return platform as AppPlatform;
        }
    }

    if (userAgent.includes('Electron')) {
        return AppPlatform.DESKTOP;
    }
    if (userAgent.includes('Android')) {
        return AppPlatform.MOBILE_ANDROID;
    }
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        return AppPlatform.MOBILE_IOS;
    }
    if (userAgent.includes('React-Native')) {
        return AppPlatform.MOBILE_REACT_NATIVE;
    }

    return AppPlatform.WEB;
}

/**
 * Centralized error handler for printer controllers
 */
export function handleError(res: Response, error: unknown): void {
    console.error('[PrinterController] Error:', error);

    if (error instanceof PrinterError) {
        BaseController.sendResponse(
            res,
            error.statusCode,
            false,
            error.message,
            { code: error.code, hint: error.hint },
            error.message
        );
        return;
    }

    if (error instanceof Error) {
        const message = error.message;
        let statusCode = 500;

        if (message.includes('not found')) statusCode = 404;
        else if (message.includes('already exists')) statusCode = 409;
        else if (message.includes('required') || message.includes('invalid')) statusCode = 400;

        BaseController.sendResponse(res, statusCode, false, message, undefined, message);
        return;
    }

    BaseController.sendResponse(res, 500, false, 'An unexpected error occurred');
}

/**
 * Create standard response with platform metadata
 */
export function createPlatformResponse<T>(
    req: Request,
    success: boolean,
    message: string,
    data?: T
) {
    return {
        success,
        message,
        data,
        meta: {
            platform: detectPlatform(req),
            timestamp: new Date().toISOString()
        }
    };
}
