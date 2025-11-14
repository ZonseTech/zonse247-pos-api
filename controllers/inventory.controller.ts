import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { InventoryService } from '../services/inventory.service';

export class InventoryController extends BaseController {
    private static getAuthContext(req: Request) {
        return {
            tenantId: req.auth?.tenantId || '',
            branchId: req.auth?.branchId || '',
            userId: req.auth?.userId || ''
        };
    }

    static async getSummary(req: Request, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const summary = await InventoryService.getProductsSummary(auth);
            BaseController.sendSuccess(res, 'Products summary retrieved successfully.', summary);
        } catch (error) {
            console.error('Error fetching products summary:', error);
            BaseController.sendServerError(res, 'Failed to fetch products summary.');
        }
    }

    static async getProduct(req: Request, res: Response): Promise<void> {
        try {
            if (!req.params.productUuid) {
                BaseController.sendBadRequest(res, 'Product ID is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const product = await InventoryService.getProductByUuid(req.params.productUuid, auth);

            if (!product) {
                BaseController.sendNotFound(res, 'Product not found.');
                return;
            }

            BaseController.sendSuccess(res, 'Product retrieved successfully.', product);
        } catch (err) {
            console.error('Error fetching product:', err);
            BaseController.sendServerError(res, 'An unexpected error occurred.');
        }
    }

    static async getProductsOnly(req: Request, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const products = await InventoryService.getActiveProducts(auth);
            BaseController.sendSuccess(res, 'Products retrieved successfully.', products);
        } catch (err) {
            console.error('Error fetching products:', err);
            BaseController.sendServerError(res, 'Failed to fetch products.');
        }
    }

    static async getProducts(req: Request, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const page = parseInt(req.query.page as string) || 1;
            const perPage = parseInt(req.query.perPage as string) || 10;
            const search = req.query.search as string || '';
            const filter = req.query.filter as string || 'all';
            const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

            const { products, total, totalPages } = await InventoryService.getProductsWithCategories(
                auth,
                page,
                perPage,
                search,
                filter,
                categoryId
            );

            BaseController.sendSuccess(res, 'Products with categories retrieved successfully.', {
                products,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: perPage
                }
            });
        } catch (error) {
            console.error('Error fetching products with categories:', error);
            BaseController.sendServerError(res, 'Failed to fetch products with categories.');
        }
    }

    static async createProduct(req: Request, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const newProduct = await InventoryService.createProduct(req.body, auth);
            BaseController.sendCreated(res, 'Product created successfully.', newProduct);
        } catch (err) {
            console.error('Error creating product:', err);
            if (err instanceof Error && err.message === 'Product validation failed') {
                BaseController.sendBadRequest(res, 'Invalid product data provided.');
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async updateProduct(req: Request, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const numReplaced = await InventoryService.updateProduct(
                req.params.productUuid,
                req.body,
                auth
            );

            if (numReplaced === 0) {
                BaseController.sendNotFound(res, 'Product not found.');
            } else {
                BaseController.sendSuccess(res, 'Product updated successfully.');
            }
        } catch (err) {
            console.error('Error updating product:', err);
            if (err instanceof Error && (
                err.message === 'Product validation failed' ||
                err.message === 'Product not found or access denied'
            )) {
                BaseController.sendBadRequest(res, err.message);
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async voidProduct(req: Request, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const numReplaced = await InventoryService.voidProduct(req.params.productUuid, auth);

            if (numReplaced === 0) {
                BaseController.sendNotFound(res, 'Product not found.');
            } else {
                BaseController.sendSuccess(res, 'Product voided successfully.');
            }
        } catch (err) {
            console.error('Error voiding product:', err);
            if (err instanceof Error && err.message === 'Product not found or access denied') {
                BaseController.sendNotFound(res, err.message);
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async deleteProduct(req: Request, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const numDeleted = await InventoryService.deleteProduct(req.params.productUuid, auth);

            if (numDeleted === 0) {
                BaseController.sendNotFound(res, 'Product not found.');
            } else {
                BaseController.sendSuccess(res, 'Product deleted successfully.');
            }
        } catch (err) {
            console.error('Error deleting product:', err);
            if (err instanceof Error && err.message === 'Product not found or access denied') {
                BaseController.sendNotFound(res, err.message);
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async findProductBySku(req: Request, res: Response): Promise<void> {
        try {
            const { skuCode } = req.body;
            if (!skuCode) {
                BaseController.sendBadRequest(res, 'SKU code is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const product = await InventoryService.findProductBySku(skuCode, auth);
            BaseController.sendSuccess(res, 'Product found successfully.', product);
        } catch (err) {
            console.error('Error finding product by SKU:', err);
            BaseController.sendServerError(res, 'An unexpected error occurred.');
        }
    }
}