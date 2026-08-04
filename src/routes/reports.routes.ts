import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.get('/summary', permissionMiddleware.requireAnyPermission(['analytics.view', 'reports.sales.daily', 'reports.financial']), ReportController.getSummary.bind(ReportController));
router.get('/total-sales', permissionMiddleware.requireAnyPermission(['reports.sales.daily', 'reports.sales.detailed']), ReportController.getTotalSales.bind(ReportController));
router.get('/net-profit', permissionMiddleware.requirePermission('reports.financial'), ReportController.getNetProfit.bind(ReportController));
router.get('/receipt-count', permissionMiddleware.requireAnyPermission(['reports.sales.daily', 'reports.sales.detailed']), ReportController.getReceiptCount.bind(ReportController));
router.get('/payment-modes', permissionMiddleware.requirePermission('reports.financial'), ReportController.getPaymentModes.bind(ReportController));
router.get('/top-stocks', permissionMiddleware.requirePermission('reports.inventory'), ReportController.getTopStocks.bind(ReportController));
router.get('/top-categories', permissionMiddleware.requireAnyPermission(['reports.sales.detailed', 'reports.inventory']), ReportController.getTopCategories.bind(ReportController));
router.get('/expenses-trend', permissionMiddleware.requirePermission('reports.financial'), ReportController.getExpensesTrend.bind(ReportController));
router.get('/expenses-by-category', permissionMiddleware.requirePermission('reports.financial'), ReportController.getExpensesByCategory.bind(ReportController));

export default router;
