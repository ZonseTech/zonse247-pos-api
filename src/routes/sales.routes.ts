import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requirePermission('sales.create'), SaleController.createSale);
router.get('/', permissionMiddleware.requireAnyPermission(['sales.view', 'sales.view.own']), SaleController.listSales);
router.get('/summaries', permissionMiddleware.requireAnyPermission(['sales.view', 'sales.view.own']), SaleController.getSummaries);
router.get('/:saleId', permissionMiddleware.requireAnyPermission(['sales.view', 'sales.view.own']), SaleController.getSale);
router.post('/:saleId/void', permissionMiddleware.requirePermission('sales.void'), SaleController.voidSale);

export default router;

