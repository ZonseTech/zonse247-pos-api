import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';

const router = Router();

router.get('/summary', ReportController.getSummary.bind(ReportController));
router.get('/total-sales', ReportController.getTotalSales.bind(ReportController));
router.get('/net-profit', ReportController.getNetProfit.bind(ReportController));
router.get('/receipt-count', ReportController.getReceiptCount.bind(ReportController));
router.get('/payment-modes', ReportController.getPaymentModes.bind(ReportController));
router.get('/top-stocks', ReportController.getTopStocks.bind(ReportController));
router.get('/top-categories', ReportController.getTopCategories.bind(ReportController));
router.get('/expenses-trend', ReportController.getExpensesTrend.bind(ReportController));
router.get('/expenses-by-category', ReportController.getExpensesByCategory.bind(ReportController));

export default router;
