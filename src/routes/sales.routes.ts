import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller';

const router = Router();

// ==========================================
// COMPLETED SALES
// ==========================================
router.post('/', SaleController.createSale);
router.get('/', SaleController.listSales);
router.get('/summaries', SaleController.getSummaries);
router.get('/:saleId', SaleController.getSale);
router.post('/:saleId/void', SaleController.voidSale);

// ==========================================
// PARKED SALES (HOLD ORDERS)
// ==========================================
router.post('/parked', SaleController.parkSale);
router.get('/parked/list', SaleController.listParkedSales);
router.get('/parked/count', SaleController.getParkedSalesCount);
router.get('/parked/:holdOrderId', SaleController.getParkedSale);
router.put('/parked/:holdOrderId', SaleController.updateParkedSale);
router.post('/parked/:holdOrderId/resume', SaleController.resumeParkedSale);
router.delete('/parked/:holdOrderId', SaleController.deleteParkedSale);

export default router;
