import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { CategoryService } from '../services/category.service';
import { AuthRequest } from '../lib/express.type';
import { CreateCategoryDto, UpdateCategoryDto } from 'categoty';

export class CategoryController {
    static async selectAll(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const categories = await CategoryService.selectAll(params);
            BaseController.sendResponse(res, 200, true, 'Categories retrieved successfully', categories);
        } catch (error: any) {
            console.error('Error fetching roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static getAllCategories = async (req: Request & AuthRequest, res: Response): Promise<void> => {
        try {
            const categories = await CategoryService.getAllCategories({
                tenantId: req.auth.tenantId,
                branchId: req.auth.activeBranchId || req.auth.branchId
            });

            BaseController.sendResponse(res, 200, true, 'Categories fetched successfully', categories);
        } catch (error) {
            BaseController.sendResponse(res, 500, false, 'Failed to fetch categories', undefined, 'Internal Server Error');
        }
    };

    static createCategory = async (req: Request & AuthRequest, res: Response): Promise<void> => {
        try {
            const { name, color, description, isDefault } = req.body;

            const categoryData: CreateCategoryDto = {
                name: name.trim(),
                color,
                description,
                isDefault
            };

            const newCategory = await CategoryService.createCategory(
                categoryData,
                {
                    userId: req.auth.userId,
                    tenantId: req.auth.tenantId,
                    branchId: req.auth.activeBranchId || req.auth.branchId,
                }
            );

            BaseController.sendResponse(res, 201, true, 'Category created successfully', newCategory);
        } catch (error) {
            BaseController.sendResponse(res, 500, false, 'Failed to create category', undefined, 'Internal Server Error');
        }
    };

    static updateCategory = async (req: Request & AuthRequest, res: Response): Promise<void> => {
        try {
            const { categoryId } = req.params;
            const { name, color, description, isDefault } = req.body;

            const updateData: UpdateCategoryDto = {
                name: name ? name.trim() : '',
                color,
                description,
                isDefault
            };

            await CategoryService.updateCategory(
                categoryId as string,
                updateData,
                {
                    userId: req.auth.userId,
                    tenantId: req.auth.tenantId,
                    branchId: req.auth.activeBranchId || req.auth.branchId,
                }
            );

            BaseController.sendResponse(res, 200, true, 'Category updated successfully');
        } catch (error) {
            if (error instanceof Error && error.message === 'Category not found or access denied') {
                BaseController.sendResponse(res, 404, false, 'Category not found or access denied', undefined, 'Not Found');
                return;
            }

            BaseController.sendResponse(res, 500, false, 'Failed to update category', undefined, 'Internal Server Error');
        }
    };

    static deleteCategory = async (req: Request & AuthRequest, res: Response): Promise<void> => {
        try {
            const { categoryId } = req.params;

            if (!categoryId) {
                BaseController.sendResponse(res, 400, false, 'Category ID is required', undefined, 'Bad Request');
                return;
            }

            await CategoryService.deleteCategory(categoryId as string, {
                userId: req.auth.userId,
                tenantId: req.auth.tenantId,
                branchId: req.auth.activeBranchId || req.auth.branchId,
            });

            BaseController.sendResponse(res, 200, true, 'Category deleted successfully');
        } catch (error) {
            if (error instanceof Error && error.message === 'Category not found or access denied') {
                BaseController.sendResponse(res, 404, false, 'Category not found or access denied', undefined, 'Not Found');
                return;
            }

            BaseController.sendResponse(res, 500, false, 'Failed to delete category', undefined, 'Internal Server Error');
        }
    };
}