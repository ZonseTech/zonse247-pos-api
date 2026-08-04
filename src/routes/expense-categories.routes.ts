import { Router } from 'express';
import { ExpenseCategoryController } from '../controllers/expense-category.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody, validateParams } from '../middlewares/validation.middleware';
import {
    createExpenseCategorySchema,
    updateExpenseCategorySchema,
    expenseCategoryIdParamSchema,
} from '../validations/expense.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.get('/', permissionMiddleware.requireAnyPermission(['expenses.view', 'expenses.create', 'expenses.manage_categories']), ExpenseCategoryController.listExpenseCategories);
router.post('/', permissionMiddleware.requirePermission('expenses.manage_categories'), validateBody(createExpenseCategorySchema), ExpenseCategoryController.createExpenseCategory);
router.put('/:categoryId', permissionMiddleware.requirePermission('expenses.manage_categories'), validateParams(expenseCategoryIdParamSchema), validateBody(updateExpenseCategorySchema), ExpenseCategoryController.updateExpenseCategory);
router.delete('/:categoryId', permissionMiddleware.requirePermission('expenses.manage_categories'), validateParams(expenseCategoryIdParamSchema), ExpenseCategoryController.deleteExpenseCategory);

export default router;
