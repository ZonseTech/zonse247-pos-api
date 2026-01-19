/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ProductService } from '../services/product.service';
import { AuthRequest } from '../lib/express.type';
import {
    DbErrorHandler,
    ValidationError,
    ConflictError,
    NotFoundError,
    BusinessLogicError,
    DatabaseError,
    TransactionError,
} from '../utils/db-error-handler.util';

export class ProductController extends BaseController {
    /**
     * Handle errors consistently using BaseController format
     */
    private static handleError(res: Response, error: unknown): void {
        // Handle validation errors
        if (error instanceof ValidationError) {
            BaseController.sendValidationError(res, error.message, error.errors);
            return;
        }

        // Handle conflict errors (duplicates)
        if (error instanceof ConflictError) {
            BaseController.sendBadRequest(res, error.message, error.field);
            return;
        }

        // Handle not found errors
        if (error instanceof NotFoundError) {
            BaseController.sendNotFound(res, error.message);
            return;
        }

        // Handle business logic errors
        if (error instanceof BusinessLogicError) {
            BaseController.sendBadRequest(res, error.message, JSON.stringify(error.details));
            return;
        }

        // Handle transaction errors
        if (error instanceof TransactionError) {
            const statusCode = error.statusCode;
            if (statusCode === 409) {
                // Conflict errors (deadlock, write conflict) - suggest retry
                BaseController.sendResponse(res, 409, false, error.message, { retryable: error.isRetryable });
            } else if (statusCode === 504) {
                // Timeout errors
                BaseController.sendResponse(res, 504, false, error.message);
            } else {
                console.error('Transaction error:', error);
                BaseController.sendServerError(res, error.message);
            }
            return;
        }

        // Handle database errors
        if (error instanceof DatabaseError) {
            const statusCode = error.statusCode;
            if (statusCode === 404) {
                BaseController.sendNotFound(res, error.message);
            } else if (statusCode === 409) {
                BaseController.sendBadRequest(res, error.message, error.field);
            } else if (statusCode >= 500) {
                console.error('Database error:', error);
                BaseController.sendServerError(res, error.message);
            } else {
                BaseController.sendBadRequest(res, error.message, error.field);
            }
            return;
        }

        // Handle generic errors
        if (error instanceof Error) {
            console.error('Unhandled error:', error);
            BaseController.sendServerError(res, 'An unexpected error occurred', error.message);
            return;
        }

        console.error('Unknown error:', error);
        BaseController.sendServerError(res, 'An unexpected error occurred');
    }

    /**
     * Create a new product
     */
    static async createProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const product = await ProductService.createProduct(
                req.body,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            BaseController.sendCreated(res, 'Product created successfully', product);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * Get product by ID
     */
    static async getProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productId } = req.params;

            if (!productId) {
                BaseController.sendBadRequest(res, 'Product ID is required');
                return;
            }

            const product = await ProductService.getProductById(
                productId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            if (!product) {
                BaseController.sendNotFound(res, `Product with ID "${productId}" not found`);
                return;
            }

            BaseController.sendSuccess(res, 'Product retrieved successfully', product);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * Search product by SKU, barcode, or name
     */
    static async searchProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const term = req.params.term as string;

            if (!term || term.trim().length === 0) {
                BaseController.sendBadRequest(res, 'Search term is required');
                return;
            }

            const result = await ProductService.searchProduct(
                term,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            if (!result) {
                BaseController.sendNotFound(res, `No product found matching "${term}"`);
                return;
            }

            BaseController.sendSuccess(res, 'Product found', result);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * List all products
     */
    static async listProducts(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const perPage = parseInt(req.query.perPage as string) || 10;
            const search = req.query.search as string || '';
            const filter = req.query.filter as string || 'all';
            const status = req.query.status as string | undefined;
            const categoryId = req.query.categoryId as string | undefined;
            const includeInactive = req.query.includeInactive === 'true';

            // Validate pagination parameters
            if (page < 1) {
                BaseController.sendBadRequest(res, 'Page number must be at least 1');
                return;
            }
            if (perPage < 1 || perPage > 100) {
                BaseController.sendBadRequest(res, 'Items per page must be between 1 and 100');
                return;
            }

            const { products, total, totalPages } = await ProductService.listProducts(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                page,
                perPage,
                search,
                filter,
                status,
                categoryId,
                includeInactive
            );

            BaseController.sendSuccess(res, 'Products retrieved successfully', {
                products,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: perPage
                }
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * Update product
     */
    static async updateProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productId } = req.params;

            if (!productId) {
                BaseController.sendBadRequest(res, 'Product ID is required');
                return;
            }

            const product = await ProductService.updateProduct(
                productId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body
            );

            BaseController.sendSuccess(res, 'Product updated successfully', product);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * Delete (deactivate) product
     */
    static async deleteProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productId } = req.params;

            if (!productId) {
                BaseController.sendBadRequest(res, 'Product ID is required');
                return;
            }

            await ProductService.deleteProduct(
                productId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            BaseController.sendSuccess(res, 'Product deleted successfully');
        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * Add barcode to product
     */
    static async addBarcode(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            const { barcode, barcodeType, barcodeSource, description } = req.body;

            if (!productId) {
                BaseController.sendBadRequest(res, 'Product ID is required');
                return;
            }

            if (!barcode || barcode.trim().length === 0) {
                BaseController.sendBadRequest(res, 'Barcode is required');
                return;
            }

            await ProductService.addBarcode(
                productId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                barcode,
                barcodeType || 'EAN13',
                barcodeSource || 'STORE',
                description
            );

            BaseController.sendCreated(res, 'Barcode added successfully');
        } catch (error) {
            this.handleError(res, error);
        }
    }
}
