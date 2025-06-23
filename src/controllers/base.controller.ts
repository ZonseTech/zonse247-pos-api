import { Response } from "express";

export class BaseController {
    static sendResponse<T>(
        res: Response,
        statusCode: number,
        success: boolean,
        message: string,
        data?: T,
        error?: string
    ): void {
        const response: ApiResponse<T> = {
            success,
            message,
            ...(data !== undefined && { data }),
            ...(error && { error })
        };

        res.status(statusCode).json(response);
    }

    static sendResponseWithSubscription<T>(
        res: Response,
        statusCode: number,
        success: boolean,
        message: string,
        subscriptionStatus: string,
        data?: T,
        error?: string
    ): void {
        const response: ApiResponse<T> = {
            success,
            message,
            subscriptionStatus,
            ...(data !== undefined && { data }),
            ...(error && { error })
        };

        res.status(statusCode).json(response);
    }

    static sendSuccess<T>(res: Response, message: string, data?: T): void {
        this.sendResponse(res, 200, true, message, data);
    }

    static sendCreated<T>(res: Response, message: string, data?: T): void {
        this.sendResponse(res, 201, true, message, data);
    }

    static sendBadRequest(res: Response, message: string, error?: string): void {
        this.sendResponse(res, 400, false, message, null, error);
    }

    static sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
        this.sendResponse(res, 401, false, message);
    }

    static sendForbiddenWithSubscription<T>(
        res: Response,
        message: string,
        subscriptionStatus: string,
        data?: T
    ): void {
        this.sendResponseWithSubscription(res, 403, false, message, subscriptionStatus, data);
    }

    static sendNotFound(res: Response, message: string = 'Resource not found'): void {
        this.sendResponse(res, 404, false, message);
    }

    static sendNotFoundWithSubscription(
        res: Response,
        message: string,
        subscriptionStatus: string
    ): void {
        this.sendResponseWithSubscription(res, 404, false, message, subscriptionStatus);
    }

    static sendServerError(res: Response, message: string = 'Internal server error', error?: string): void {
        this.sendResponse(res, 500, false, message, null, error);
    }

    static sendServerErrorWithSubscription(
        res: Response,
        message: string,
        subscriptionStatus: string = 'error'
    ): void {
        this.sendResponseWithSubscription(res, 500, false, message, subscriptionStatus);
    }

    static sendValidationError(res: Response, message: string, errors?: any): void {
        this.sendResponse(res, 422, false, message, errors);
    }
}