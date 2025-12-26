import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../controllers/base.controller';

type ClientType = 'web' | 'mobile' | 'desktop';

const VALID_CLIENT_TYPES: ClientType[] = ['web', 'mobile', 'desktop'];

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

            const normalizedClientType = clientType.trim().toLowerCase() as ClientType;

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
}

export const apiMiddleware = new ApiMiddleware();
