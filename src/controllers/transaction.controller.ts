import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { TransactionService } from "../services/transaction.service";
import { AuthRequest } from "../lib/express.type";

export class TransactionController extends BaseController {

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const includeItems = req.query.includeItems === 'true';
            const transactions = await TransactionService.getAllTransactions(includeItems);
            BaseController.sendResponse(res, 200, true, 'Transactions retrieved successfully', transactions);
        } catch (error: any) {
            console.error('Error fetching transactions:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getByDateRange(req: Request, res: Response): Promise<void> {
        try {
            const { start, end, status, user, till, includeItems } = req.query;

            if (!start || !end) {
                BaseController.sendResponse(res, 400, false, 'Start date and end date are required');
                return;
            }

            const filters = {
                startDate: new Date(start.toString()),
                endDate: new Date(end.toString()),
                status: status ? parseInt(status.toString()) : undefined,
                user: user ? parseInt(user.toString()) : undefined,
                till: till ? parseInt(till.toString()) : undefined,
                includeItems: includeItems === 'true'
            };

            const transactions = await TransactionService.getTransactionsByDateRange(filters);
            BaseController.sendResponse(res, 200, true, 'Transactions retrieved successfully', transactions);
        } catch (error: any) {
            console.error('Error fetching transactions by date:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const newTransaction = await TransactionService.createTransaction(req.body, {
                tenantId: req.auth.tenantId,
                branchId: req.auth.branchId,
                userId: req.auth.userId,
            });
            BaseController.sendResponse(res, 201, true, 'Transaction created successfully', newTransaction);
        } catch (error: any) {
            console.error('Error creating transaction:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async update(req: Request<{ transactionId: string }>, res: Response): Promise<void> {
        try {
            const { transactionId } = req.params;
            const updatedTransaction = await TransactionService.updateTransaction(transactionId, req.body);
            BaseController.sendResponse(res, 200, true, 'Transaction updated successfully', updatedTransaction);
        } catch (error: any) {
            console.error('Error updating transaction:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async show(req: Request<{ transactionId: string }>, res: Response): Promise<void> {
        try {
            const { transactionId } = req.params;
            const includeItems = req.query.includeItems !== 'false';
            const transaction = await TransactionService.getTransactionById(transactionId, includeItems);
            BaseController.sendResponse(res, 200, true, 'Transaction retrieved successfully', transaction);
        } catch (error: any) {
            console.error('Error fetching transaction:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async getSummary(req: Request<{ transactionId: string }>, res: Response): Promise<void> {
        try {
            const { transactionId } = req.params;
            const summary = await TransactionService.getTransactionSummary(transactionId);
            BaseController.sendResponse(res, 200, true, 'Transaction summary retrieved successfully', summary);
        } catch (error: any) {
            console.error('Error fetching transaction summary:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async delete(req: Request<{ transactionId: string }>, res: Response): Promise<void> {
        try {
            const { transactionId } = req.params;
            const result = await TransactionService.deleteTransaction(transactionId);
            BaseController.sendResponse(res, 200, true, 'Transaction deleted successfully', result);
        } catch (error: any) {
            console.error('Error deleting transaction:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}