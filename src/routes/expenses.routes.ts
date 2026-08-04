import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import {
    createExpenseSchema,
    updateExpenseSchema,
    rejectExpenseSchema,
    voidExpenseSchema,
    expenseIdParamSchema,
    listExpensesQuerySchema,
    expenseSummaryQuerySchema,
} from '../validations/expense.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requirePermission('expenses.create'), validateBody(createExpenseSchema), ExpenseController.createExpense);
router.get('/', permissionMiddleware.requirePermission('expenses.view'), validateQuery(listExpensesQuerySchema), ExpenseController.listExpenses);
router.get('/summary', permissionMiddleware.requirePermission('expenses.view'), validateQuery(expenseSummaryQuerySchema), ExpenseController.getExpenseSummary);
router.get('/:expenseId', permissionMiddleware.requirePermission('expenses.view'), validateParams(expenseIdParamSchema), ExpenseController.getExpense);
router.put('/:expenseId', permissionMiddleware.requirePermission('expenses.create'), validateParams(expenseIdParamSchema), validateBody(updateExpenseSchema), ExpenseController.updateExpense);
router.post('/:expenseId/approve', permissionMiddleware.requirePermission('expenses.approve'), validateParams(expenseIdParamSchema), ExpenseController.approveExpense);
router.post('/:expenseId/reject', permissionMiddleware.requirePermission('expenses.approve'), validateParams(expenseIdParamSchema), validateBody(rejectExpenseSchema), ExpenseController.rejectExpense);
router.post('/:expenseId/void', permissionMiddleware.requirePermission('expenses.void'), validateParams(expenseIdParamSchema), validateBody(voidExpenseSchema), ExpenseController.voidExpense);

export default router;
