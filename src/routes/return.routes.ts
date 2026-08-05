import { Router } from 'express';
import { ReturnController } from '../controllers/return.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody, validateQuery } from '../middlewares/validation.middleware';
import { returnValidationSchemas } from '../validations/return.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.get('/', permissionMiddleware.requireAnyPermission(['refunds.view', 'sales.view', 'sales.view.own']), ReturnController.getAllReturns);
router.post(
    '/initiate',
    permissionMiddleware.requirePermission('refunds.process'),
    validateBody(returnValidationSchemas.initiateReturn),
    ReturnController.initiateReturn
);
router.get('/sale/:saleId', permissionMiddleware.requireAnyPermission(['refunds.view', 'sales.view', 'sales.view.own']), ReturnController.getReturnsBySale);
router.get('/:saleId', permissionMiddleware.requireAnyPermission(['refunds.view', 'sales.view', 'sales.view.own']), ReturnController.getReturnById);
router.delete('/:saleId', permissionMiddleware.requireAnyPermission(['refunds.void', 'refunds.approve']), ReturnController.cancelReturn);
router.post(
    '/:saleId/restock',
    permissionMiddleware.requireAnyPermission(['refunds.approve', 'inventory.receive']),
    validateBody(returnValidationSchemas.restockItems),
    ReturnController.restockItems
);
router.get(
    '/statistics/summary',
    permissionMiddleware.requireAnyPermission(['refunds.view', 'sales.view', 'sales.view.own']),
    validateQuery(returnValidationSchemas.returnStatistics),
    ReturnController.getReturnStatistics
);

export default router;
