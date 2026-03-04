import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { ClientType, ClientTypeValue } from '../utils/enums';
import { BaseController } from '../controllers/base.controller';

const VALID_CLIENT_TYPES: ClientTypeValue[] = Object.values(ClientType);

export class ApiMiddleware {
    verifyClientType = (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        try {
            const clientType = req.headers['x-client-type'] as string | undefined;

            if (!clientType || clientType.trim() === '') {
                return BaseController.sendResponseWithSubscription(
                    res,
                    400,
                    false,
                    'Missing X-Client-Type header. Please specify the client type (web, mobile, or desktop).',
                    'unknown',
                    null
                );
            }

            const normalizedClientType = clientType.trim().toLowerCase() as ClientTypeValue;

            if (!VALID_CLIENT_TYPES.includes(normalizedClientType)) {
                return BaseController.sendResponseWithSubscription(
                    res,
                    400,
                    false,
                    `Invalid X-Client-Type value: '${clientType}'. Allowed values are: web, mobile, desktop.`,
                    'unknown',
                    null
                );
            }

            req.headers['x-client-type'] = normalizedClientType;

            next();
        } catch (error) {
            return BaseController.sendResponseWithSubscription(
                res,
                500,
                false,
                'An error occurred while validating the client type.',
                'unknown',
                null
            );
        }
    };

    verifyRequestHeaders = (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        try {
            const tenantId = req.headers['x-tenant-id'] as string | undefined;
            const clientType = req.headers['x-client-type'] as string | undefined;
            const tenantSignature = req.headers['x-tenant-signature'] as string | undefined;

            const isEmpty = (value: string | undefined): boolean => {
                return !value || value.trim() === '';
            };

            const sendError = (message: string): void => {
                BaseController.sendResponseWithSubscription(
                    res,
                    400,
                    false,
                    message,
                    'unknown',
                    null
                );
            };

            if (isEmpty(clientType)) {
                return sendError('Application not verified. Please provide X-Client-Type header.');
            }

            if (isEmpty(tenantSignature) && isEmpty(tenantId)) {
                return sendError('Application not verified. Please provide X-Tenant-Signature or X-Tenant-Id header.');
            }

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
}

export const apiMiddleware = new ApiMiddleware();
