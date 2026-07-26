import { Router } from 'express';
import { ExpenseCategoryController } from '../controllers/expense-category.controller';
import { validateBody, validateParams } from '../middlewares/validation.middleware';
import {
    createExpenseCategorySchema,
    updateExpenseCategorySchema,
    expenseCategoryIdParamSchema,
} from '../validations/expense.schemas';

const router = Router();

router.get('/', ExpenseCategoryController.listExpenseCategories);
router.post('/', validateBody(createExpenseCategorySchema), ExpenseCategoryController.createExpenseCategory);
router.put('/:categoryId', validateParams(expenseCategoryIdParamSchema), validateBody(updateExpenseCategorySchema), ExpenseCategoryController.updateExpenseCategory);
router.delete('/:categoryId', validateParams(expenseCategoryIdParamSchema), ExpenseCategoryController.deleteExpenseCategory);

export default router;
