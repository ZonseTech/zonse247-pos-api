import { Router } from 'express';
import { ParkedSalesController } from '../controllers/parked-sales.controller';

const router = Router();

router.post('/', ParkedSalesController.parkSale);
router.get('/list', ParkedSalesController.listParkedSales);
router.get('/count', ParkedSalesController.getParkedSalesCount);
router.get('/:parkedSaleId', ParkedSalesController.getParkedSale);
router.put('/:parkedSaleId', ParkedSalesController.updateParkedSale);
router.post('/:parkedSaleId/resume', ParkedSalesController.resumeParkedSale);
router.delete('/:parkedSaleId', ParkedSalesController.deleteParkedSale);

export default router;
