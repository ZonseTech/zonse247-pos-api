import { Router } from 'express';
import { StockMovementController } from '../controllers/stock-movement.controller';

const router = Router();

router.get('/product/:productId', StockMovementController.getProductMovements);
router.get('/branch', StockMovementController.getBranchMovements);

export default router;
