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
router.get('/transaction/:transactionId', ReturnController.getReturnsByTransaction);
router.get('/:returnTransactionId', ReturnController.getReturnById);
router.delete('/:returnTransactionId', ReturnController.cancelReturn);
router.post(
    '/:returnTransactionId/restock',
    validateBody(returnValidationSchemas.restockItems),
    ReturnController.restockItems
);
router.get(
    '/statistics/summary',
    validateQuery(returnValidationSchemas.returnStatistics),
    ReturnController.getReturnStatistics
);

export default router;
