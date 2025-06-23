import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { CategoryService } from '../services/category.service';

export class CategoryController extends BaseController {
    static getWelcome = (req: Request, res: Response): void => {
        CategoryController.sendResponse(res, 200, true, 'Category API');
    };

    static getAllCategories = async (req: Request, res: Response): Promise<void> => {
        try {
            const categories = await CategoryService.getAllCategories({
                clientUuid: req.auth.clientUuid,
                shopUuid: req.auth.shopUuid
            });

            CategoryController.sendResponse(res, 200, true, 'Categories fetched successfully', categories);
        } catch (error) {
            console.error('Error in getAllCategories:', error);
            CategoryController.sendResponse(res, 500, false, 'Failed to fetch categories', undefined, 'Internal Server Error');
        }
    };

    static createCategory = async (req: Request, res: Response): Promise<void> => {
        try {
            const { name, color, description, } = req.body;
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                CategoryController.sendResponse(res, 400, false, 'Category name is required and must be a non-empty string', undefined, 'Bad Request');
                return;
            }

            const categoryData: CreateCategoryDto = {
                name: name.trim(),
                color,
                description
            };

            const newCategory = await CategoryService.createCategory(
                categoryData,
                {
                    userUuid: req.auth.uuid,
                    clientUuid: req.auth.clientUuid,
                    shopUuid: req.auth.shopUuid,
                }
            );

            CategoryController.sendResponse(res, 201, true, 'Category created successfully', newCategory);
        } catch (error) {
            console.error('Error in createCategory:', error);
            CategoryController.sendResponse(res, 500, false, 'Failed to create category', undefined, 'Internal Server Error');
        }
    };

    static updateCategory = async (req: Request, res: Response): Promise<void> => {
        try {
            const { categoryId } = req.params;
            const { name, color, description } = req.body;

            if (!categoryId) {
                CategoryController.sendResponse(res, 400, false, 'Category ID is required', undefined, 'Bad Request');
                return;
            }

            if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
                CategoryController.sendResponse(res, 400, false, 'Category name must be a non-empty string if provided', undefined, 'Bad Request');
                return;
            }

            const updateData: UpdateCategoryDto = {
                color,
                description
            };

            if (name !== undefined) {
                updateData.name = name.trim();
            }

            await CategoryService.updateCategory(
                categoryId,
                updateData,
                {
                    userUuid: req.auth.uuid,
                    clientUuid: req.auth.clientUuid,
                    shopUuid: req.auth.shopUuid,
                }
            );

            CategoryController.sendResponse(res, 200, true, 'Category updated successfully');
        } catch (error) {
            console.error('Error in updateCategory:', error);

            if (error instanceof Error && error.message === 'Category not found or access denied') {
                CategoryController.sendResponse(res, 404, false, 'Category not found or access denied', undefined, 'Not Found');
                return;
            }

            CategoryController.sendResponse(res, 500, false, 'Failed to update category', undefined, 'Internal Server Error');
        }
    };

    static deleteCategory = async (req: Request, res: Response): Promise<void> => {
        try {
            const { categoryId } = req.params;

            if (!categoryId) {
                CategoryController.sendResponse(res, 400, false, 'Category ID is required', undefined, 'Bad Request');
                return;
            }

            await CategoryService.deleteCategory(categoryId, {
                userUuid: req.auth.uuid,
                clientUuid: req.auth.clientUuid,
                shopUuid: req.auth.shopUuid,
            });

            CategoryController.sendResponse(res, 200, true, 'Category deleted successfully');
        } catch (error) {
            console.error('Error in deleteCategory:', error);

            if (error instanceof Error && error.message === 'Category not found or access denied') {
                CategoryController.sendResponse(res, 404, false, 'Category not found or access denied', undefined, 'Not Found');
                return;
            }

            CategoryController.sendResponse(res, 500, false, 'Failed to delete category', undefined, 'Internal Server Error');
        }
    };
}