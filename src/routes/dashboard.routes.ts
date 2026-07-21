import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();

router.get('/summary', DashboardController.getSummary.bind(DashboardController));
router.get('/revenue-trend', DashboardController.getRevenueTrend.bind(DashboardController));
router.get('/payment-methods', DashboardController.getPaymentMethodsBreakdown.bind(DashboardController));
router.get('/top-products', DashboardController.getTopSellingProducts.bind(DashboardController));
router.get('/recent-sales', DashboardController.getRecentSales.bind(DashboardController));
router.get('/low-stock', DashboardController.getLowStockAlerts.bind(DashboardController));

export default router;
