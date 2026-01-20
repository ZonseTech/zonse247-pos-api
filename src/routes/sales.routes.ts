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
// PARKED SALES
// ==========================================
router.post('/parked', SaleController.parkSale);
router.get('/parked/list', SaleController.listParkedSales);
router.get('/parked/count', SaleController.getParkedSalesCount);
router.get('/parked/:parkedSaleId', SaleController.getParkedSale);
router.put('/parked/:parkedSaleId', SaleController.updateParkedSale);
router.post('/parked/:parkedSaleId/resume', SaleController.resumeParkedSale);
router.delete('/parked/:parkedSaleId', SaleController.deleteParkedSale);

export default router;
