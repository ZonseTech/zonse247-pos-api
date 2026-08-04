import { Router } from 'express';
import { ParkedSalesController } from '../controllers/parked-sales.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requireAnyPermission(['sales.hold', 'sales.create']), ParkedSalesController.parkSale);
router.get('/list', permissionMiddleware.requireAnyPermission(['sales.view', 'sales.view.own', 'sales.hold']), ParkedSalesController.listParkedSales);
router.get('/count', permissionMiddleware.requireAnyPermission(['sales.view', 'sales.view.own', 'sales.hold']), ParkedSalesController.getParkedSalesCount);
router.get('/:parkedSaleId', permissionMiddleware.requireAnyPermission(['sales.view', 'sales.view.own', 'sales.hold']), ParkedSalesController.getParkedSale);
router.put('/:parkedSaleId', permissionMiddleware.requireAnyPermission(['sales.edit', 'sales.hold']), ParkedSalesController.updateParkedSale);
router.post('/:parkedSaleId/resume', permissionMiddleware.requireAnyPermission(['sales.edit', 'sales.hold', 'sales.create']), ParkedSalesController.resumeParkedSale);
router.delete('/:parkedSaleId', permissionMiddleware.requireAnyPermission(['sales.edit', 'sales.hold']), ParkedSalesController.deleteParkedSale);

export default router;
