import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../lib/express.type';
import { BaseController } from './base.controller';
import { ExpenseService } from '../services/expense.service';

export class ExpenseController extends BaseController {
    /**
     * POST /expenses
     * Record a new expense. Always created as PENDING_APPROVAL.
     */
    static async createExpense(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const terminalId = (req.headers['x-terminal-id'] as string) || req.body.terminalId;

            const expense = await ExpenseService.createExpense(
                req.body,
                tenantId,
                branchId,
                req.auth.userId,
                terminalId
            );

            BaseController.sendResponse(res, 201, true, 'Expense recorded', expense);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /expenses/:expenseId
     * Edit a recorded expense. Only allowed while PENDING_APPROVAL.
     */
    static async updateExpense(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { expenseId } = req.params as { expenseId: string };

            const expense = await ExpenseService.updateExpense(expenseId, req.body, tenantId, branchId);

            BaseController.sendResponse(res, 200, true, 'Expense updated', expense);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /expenses/:expenseId/approve
     */
    static async approveExpense(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { expenseId } = req.params as { expenseId: string };

            const expense = await ExpenseService.approveExpense(expenseId, tenantId, branchId, req.auth.userId);

            BaseController.sendResponse(res, 200, true, 'Expense approved', expense);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /expenses/:expenseId/reject
     */
    static async rejectExpense(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { expenseId } = req.params as { expenseId: string };

            const expense = await ExpenseService.rejectExpense(
                expenseId,
                tenantId,
                branchId,
                req.auth.userId,
                req.body.rejectedReason
            );

            BaseController.sendResponse(res, 200, true, 'Expense rejected', expense);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /expenses/:expenseId/void
     */
    static async voidExpense(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { expenseId } = req.params as { expenseId: string };

            const expense = await ExpenseService.voidExpense(expenseId, tenantId, branchId, req.body.reason);

            BaseController.sendResponse(res, 200, true, 'Expense voided', expense);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /expenses/:expenseId
     */
    static async getExpense(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { expenseId } = req.params as { expenseId: string };

            const expense = await ExpenseService.getExpenseById(expenseId, tenantId, branchId);

            if (!expense) {
                BaseController.sendResponse(res, 404, false, 'Expense not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Expense retrieved', expense);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /expenses
     */
    static async listExpenses(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const result = await ExpenseService.listExpenses(tenantId, branchId, req.query as any);

            BaseController.sendResponse(res, 200, true, 'Expenses listed', result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /expenses/summary
     */
    static async getExpenseSummary(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const summary = await ExpenseService.getExpenseSummary(tenantId, branchId, req.query as any);

            BaseController.sendResponse(res, 200, true, 'Expense summary retrieved', summary);
        } catch (error) {
            next(error);
        }
    }
}
