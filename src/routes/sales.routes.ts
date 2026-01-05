import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller';

const router = Router();

// Sale operations
router.post('/', SaleController.createSale);
router.get('/', SaleController.listSales);
router.get('/:saleId', SaleController.getSale);
router.post('/:saleId/void', SaleController.voidSale);

export default router;
