import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller';
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

router.post('/', validateBody(createExpenseSchema), ExpenseController.createExpense);
router.get('/', validateQuery(listExpensesQuerySchema), ExpenseController.listExpenses);
router.get('/summary', validateQuery(expenseSummaryQuerySchema), ExpenseController.getExpenseSummary);
router.get('/:expenseId', validateParams(expenseIdParamSchema), ExpenseController.getExpense);
router.put('/:expenseId', validateParams(expenseIdParamSchema), validateBody(updateExpenseSchema), ExpenseController.updateExpense);
router.post('/:expenseId/approve', validateParams(expenseIdParamSchema), ExpenseController.approveExpense);
router.post('/:expenseId/reject', validateParams(expenseIdParamSchema), validateBody(rejectExpenseSchema), ExpenseController.rejectExpense);
router.post('/:expenseId/void', validateParams(expenseIdParamSchema), validateBody(voidExpenseSchema), ExpenseController.voidExpense);

export default router;
