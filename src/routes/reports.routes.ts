import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';

const router = Router();

router.get('/summary', ReportController.getSummary.bind(ReportController));
router.get('/total-sales', ReportController.getTotalSales.bind(ReportController));
router.get('/gross-profit', ReportController.getGrossProfit.bind(ReportController));
router.get('/receipt-count', ReportController.getReceiptCount.bind(ReportController));
router.get('/payment-modes', ReportController.getPaymentModes.bind(ReportController));

export default router;
