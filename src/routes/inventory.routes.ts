import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';

const router = Router();

router.get('/summary', InventoryController.getSummary);
router.get('/overview', InventoryController.getOverview);
router.get('/top-value', InventoryController.getTopValueItems);
router.get('/count', InventoryController.getCount);
router.get('/', InventoryController.getInventoryItems);
router.get('/all', InventoryController.getAllInventoryItems);
router.get('/items-only', InventoryController.getInventoryItemsOnly);
router.get('/item/:itemId', InventoryController.getInventoryItem);
router.get('/search', InventoryController.searchInventoryItems);
router.get('/barcode/:barcode', InventoryController.findInventoryItemByBarcode);
router.get('/category/:categoryId', InventoryController.getInventoryItemsByCategory);
router.get('/status/:status', InventoryController.getInventoryItemsByStatus);
router.post('/item/sku', InventoryController.findInventoryItemBySku);
router.get('/low-stock', InventoryController.getLowStockItems);
router.get('/exists/:itemId', InventoryController.checkInventoryItemExists);
router.post('/item', InventoryController.createInventoryItem);
router.put('/item/:itemId', InventoryController.updateInventoryItem);
router.put('/item-void/:itemId', InventoryController.voidInventoryItem);
router.patch('/item/:itemId/quantity', InventoryController.updateInventoryQuantity);
router.patch('/item/:itemId/adjust', InventoryController.adjustInventory);
router.put('/bulk-update', InventoryController.bulkUpdateInventoryItems);
router.put('/move-to-category', InventoryController.moveToCategory);
router.post('/sync-category-counts', InventoryController.syncCategoryItemCounts);
router.delete('/item/:itemId', InventoryController.deleteInventoryItem);

export default router;
