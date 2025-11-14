import { Response } from "express";

/**
 * Base Controller Class
 * Provides standardized response methods for all controllers
 * @class BaseController
 */
export class BaseController {
    /**
     * Send standardized API response
     * @static
     * @template T
     * @param res - Express response object
     * @param statusCode - HTTP status code
     * @param success - Operation success status
     * @param message - Response message
     * @param data - Response data payload (optional)
     * @param error - Error details (optional)
     */
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

    /**
     * Send standardized API response with subscription status
     * @static
     * @template T
     * @param res - Express response object
     * @param statusCode - HTTP status code
     * @param success - Operation success status
     * @param message - Response message
     * @param subscriptionStatus - User subscription status
     * @param data - Response data payload (optional)
     * @param error - Error details (optional)
     */
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

    /**
     * Send success response (200)
     * @static
     * @template T
     * @param res - Express response object
     * @param message - Success message
     * @param data - Response data (optional)
     */
    static sendSuccess<T>(res: Response, message: string, data?: T): void {
        this.sendResponse(res, 200, true, message, data);
    }

    /**
     * Send created response (201)
     * @static
     * @template T
     * @param res - Express response object
     * @param message - Creation success message
     * @param data - Created resource data (optional)
     */
    static sendCreated<T>(res: Response, message: string, data?: T): void {
        this.sendResponse(res, 201, true, message, data);
    }

    /**
     * Send bad request response (400)
     * @static
     * @param res - Express response object
     * @param message - Error message
     * @param error - Detailed error information (optional)
     */
    static sendBadRequest(res: Response, message: string, error?: string): void {
        this.sendResponse(res, 400, false, message, null, error);
    }

    /**
     * Send unauthorized response (401)
     * @static
     * @param res - Express response object
     * @param message - Unauthorized message (default: 'Unauthorized')
     */
    static sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
        this.sendResponse(res, 401, false, message);
    }

    /**
     * Send forbidden response with subscription status (403)
     * @static
     * @template T
     * @param res - Express response object
     * @param message - Forbidden message
     * @param subscriptionStatus - User's subscription status
     * @param data - Additional data (optional)
     */
    static sendForbiddenWithSubscription<T>(
        res: Response,
        message: string,
        subscriptionStatus: string,
        data?: T
    ): void {
        this.sendResponseWithSubscription(res, 403, false, message, subscriptionStatus, data);
    }

    /**
     * Send not found response (404)
     * @static
     * @param res - Express response object
     * @param message - Not found message (default: 'Resource not found')
     */
    static sendNotFound(res: Response, message: string = 'Resource not found'): void {
        this.sendResponse(res, 404, false, message);
    }

    /**
     * Send not found response with subscription status (404)
     * @static
     * @param res - Express response object
     * @param message - Not found message
     * @param subscriptionStatus - User's subscription status
     */
    static sendNotFoundWithSubscription(
        res: Response,
        message: string,
        subscriptionStatus: string
    ): void {
        this.sendResponseWithSubscription(res, 404, false, message, subscriptionStatus);
    }

    /**
     * Send server error response (500)
     * @static
     * @param res - Express response object
     * @param message - Error message (default: 'Internal server error')
     * @param error - Detailed error information (optional)
     */
    static sendServerError(res: Response, message: string = 'Internal server error', error?: string): void {
        this.sendResponse(res, 500, false, message, null, error);
    }

    /**
     * Send server error response with subscription status (500)
     * @static
     * @param res - Express response object
     * @param message - Error message
     * @param subscriptionStatus - Subscription status (default: 'error')
     */
    static sendServerErrorWithSubscription(
        res: Response,
        message: string,
        subscriptionStatus: string = 'error'
    ): void {
        this.sendResponseWithSubscription(res, 500, false, message, subscriptionStatus);
    }

    /**
     * Send validation error response (422)
     * @static
     * @param res - Express response object
     * @param message - Validation error message
     * @param errors - Validation error details (optional)
     */
    static sendValidationError(res: Response, message: string, errors?: any): void {
        this.sendResponse(res, 422, false, message, errors);
    }
}