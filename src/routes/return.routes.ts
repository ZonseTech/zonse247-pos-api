import { Router } from 'express';
import { ReturnController } from '../controllers/return.controller';
import { validateBody, validateQuery } from '../middlewares/validation.middleware';
import { returnValidationSchemas } from '../validations/return.schemas';

const router = Router();

router.get('/', ReturnController.getAllReturns);
router.post(
    '/initiate',
    validateBody(returnValidationSchemas.initiateReturn),
    ReturnController.initiateReturn
);
router.get('/sale/:saleId', ReturnController.getReturnsBySale);
router.get('/:saleId', ReturnController.getReturnById);
router.delete('/:saleId', ReturnController.cancelReturn);
router.post(
    '/:saleId/restock',
    validateBody(returnValidationSchemas.restockItems),
    ReturnController.restockItems
);
router.get(
    '/statistics/summary',
    validateQuery(returnValidationSchemas.returnStatistics),
    ReturnController.getReturnStatistics
);

export default router;
