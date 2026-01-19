/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ProductService } from '../services/product.service';
import { AuthRequest } from '../lib/express.type';

export class ProductController extends BaseController {
    /**
     * Create a new product
     */
    static async createProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const product = await ProductService.createProduct(req.body, req.auth.tenantId, req.auth.activeBranchId || req.auth.branchId);

            BaseController.sendResponse(res, 201, true, 'Product created successfully', product);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to create product', undefined, error.message);
        }
    }

    /**
     * Get product by ID
     */
    static async getProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productId } = req.params;

            const product = await ProductService.getProductById(
                productId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            if (!product) {
                BaseController.sendResponse(res, 404, false, 'Product not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Product retrieved successfully', product);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get product', undefined, error.message);
        }
    }

    /**
     * Search product by SKU, barcode, or name
     */
    static async searchProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { term } = req.params;

            const result = await ProductService.searchProduct(
                term as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            if (!result) {
                BaseController.sendResponse(res, 404, false, 'Product not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Product found', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Search failed', undefined, error.message);
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

            BaseController.sendResponse(res, 200, true, 'Products retrieved successfully', {
                products,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: perPage
                }
            });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to list products', undefined, error.message);
        }
    }

    /**
     * Update product
     */
    static async updateProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productId } = req.params;

            const product = await ProductService.updateProduct(
                productId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body
            );

            BaseController.sendResponse(res, 200, true, 'Product updated successfully', product);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to update product', undefined, error.message);
        }
    }

    /**
     * Delete (deactivate) product
     */
    static async deleteProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productId } = req.params;

            await ProductService.deleteProduct(
                productId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            BaseController.sendResponse(res, 200, true, 'Product deleted successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to delete product', undefined, error.message);
        }
    }

    /**
     * Add barcode to product
     */
    static async addBarcode(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            const { barcode, barcodeType, barcodeSource, description } = req.body;

            await ProductService.addBarcode(
                productId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                barcode,
                barcodeType,
                barcodeSource,
                description
            );

            BaseController.sendResponse(res, 201, true, 'Barcode added successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to add barcode', undefined, error.message);
        }
    }
}
