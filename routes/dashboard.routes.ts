import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

router.get('/monthly-sales/:userUuid/:monthYear', AnalyticsController.getMonthlySales);
router.get('/transactions/:userUuid/:limit/:offset', AnalyticsController.getTransactions);
router.get('/top-products', AnalyticsController.getTopProducts);
router.get('/counts/:userUuid', AnalyticsController.getCounts);
router.get('/transaction/:transactionId/items', AnalyticsController.getTransactionItems);
router.get('/transaction/:transactionId/details', AnalyticsController.getTransactionDetails);

export default router;
