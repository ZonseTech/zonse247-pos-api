import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../lib/express.type';
import { BaseController } from './base.controller';
import { ExpenseCategoryService } from '../services/expense-category.service';

export class ExpenseCategoryController extends BaseController {
    static async listExpenseCategories(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const categories = await ExpenseCategoryService.listExpenseCategories(tenantId, branchId);

            BaseController.sendResponse(res, 200, true, 'Expense categories retrieved', categories);
        } catch (error) {
            next(error);
        }
    }

    static async createExpenseCategory(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const category = await ExpenseCategoryService.createExpenseCategory(req.body, {
                tenantId,
                branchId,
                userId: req.auth.userId,
            });

            BaseController.sendResponse(res, 201, true, 'Expense category created', category);
        } catch (error) {
            next(error);
        }
    }

    static async updateExpenseCategory(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { categoryId } = req.params as { categoryId: string };

            const category = await ExpenseCategoryService.updateExpenseCategory(categoryId, req.body, {
                tenantId,
                branchId,
                userId: req.auth.userId,
            });

            BaseController.sendResponse(res, 200, true, 'Expense category updated', category);
        } catch (error) {
            next(error);
        }
    }

    static async deleteExpenseCategory(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { categoryId } = req.params as { categoryId: string };

            await ExpenseCategoryService.deleteExpenseCategory(categoryId, {
                tenantId,
                branchId,
                userId: req.auth.userId,
            });

            BaseController.sendResponse(res, 200, true, 'Expense category deleted');
        } catch (error) {
            next(error);
        }
    }
}
