import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';

const router = Router();

router.get('/summary', InventoryController.getSummary);
router.get('/', InventoryController.getProducts);
router.post('/product', InventoryController.createProduct);
router.post('/product/sku', InventoryController.findProductBySku);
router.get('/products-only', InventoryController.getProductsOnly);
router.get('/product/:productUuid', InventoryController.getProduct);
router.put('/product/:productUuid', InventoryController.updateProduct);
router.put('/product-void/:productUuid', InventoryController.voidProduct);
router.delete('/product/:productUuid', InventoryController.deleteProduct);

export default router;
