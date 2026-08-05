import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.get('/summary', permissionMiddleware.requireAnyPermission(['analytics.view', 'reports.sales.daily']), DashboardController.getSummary.bind(DashboardController));
router.get('/revenue-trend', permissionMiddleware.requireAnyPermission(['analytics.view', 'reports.sales.daily']), DashboardController.getRevenueTrend.bind(DashboardController));
router.get('/payment-methods', permissionMiddleware.requireAnyPermission(['analytics.view', 'reports.financial']), DashboardController.getPaymentMethodsBreakdown.bind(DashboardController));
router.get('/expenses-by-category', permissionMiddleware.requireAnyPermission(['analytics.view', 'reports.financial']), DashboardController.getExpensesByCategory.bind(DashboardController));
router.get('/top-products', permissionMiddleware.requireAnyPermission(['analytics.view', 'reports.sales.detailed']), DashboardController.getTopSellingProducts.bind(DashboardController));
router.get('/recent-sales', permissionMiddleware.requireAnyPermission(['analytics.view', 'reports.sales.detailed']), DashboardController.getRecentSales.bind(DashboardController));
router.get('/low-stock', permissionMiddleware.requireAnyPermission(['analytics.view', 'reports.inventory']), DashboardController.getLowStockAlerts.bind(DashboardController));

export default router;
