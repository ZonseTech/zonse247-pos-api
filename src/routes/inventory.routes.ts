import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';

const router = Router();

router.get('/summary', InventoryController.getSummary);
router.get('/', InventoryController.getInventoryItems);
router.post('/item', InventoryController.createInventoryItem);
router.post('/item/sku', InventoryController.findInventoryItemBySku);
router.get('/items-only', InventoryController.getInventoryItemsOnly);
router.get('/item/:itemId', InventoryController.getInventoryItem);
router.put('/item/:itemId', InventoryController.updateInventoryItem);
router.put('/item-void/:itemId', InventoryController.voidInventoryItem);
router.delete('/item/:itemId', InventoryController.deleteInventoryItem);

export default router;
