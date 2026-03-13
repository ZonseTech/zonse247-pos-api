import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';

const router = Router();

/**
 * GET /summary
 * Get inventory summary statistics (totalStock, newStock, expiringSoon, expired)
 */
router.get('/summary', InventoryController.getSummary);

/**
 * GET /overview
 * Get comprehensive inventory overview with stock valuation, category breakdown, and health metrics
 * @query {string} [search] - Search term for filtering
 * @query {string} [filter] - Filter type: all, new, low-stock, expiring-soon, expired
 * @query {string} [categoryId] - Filter by category UUID
 * @query {string} [startDate] - Filter by creation date range start
 * @query {string} [endDate] - Filter by creation date range end
 */
router.get('/overview', InventoryController.getOverview);

/**
 * GET /top-value
 * Get top valuable inventory items sorted by retail value
 * @query {number} [limit=10] - Maximum number of items to return
 */
router.get('/top-value', InventoryController.getTopValueItems);

/**
 * GET /count
 * Get detailed inventory counts (total, incomplete, inStock, lowStock, expired)
 */
router.get('/count', InventoryController.getCount);

/**
 * GET /
 * Get paginated inventory items with optional grouping by product
 * @query {number} [page=1] - Page number
 * @query {number} [perPage=10] - Items per page
 * @query {string} [search] - Search term
 * @query {string} [filter] - Filter type: all, new, low-stock, expiring-soon, expired
 * @query {string} [categoryId] - Filter by category UUID
 * @query {string} [startDate] - Filter by date range start
 * @query {string} [endDate] - Filter by date range end
 * @query {boolean} [groupByProduct=false] - Group variants under their parent product
 */
router.get('/', InventoryController.getInventoryItems);

/**
 * GET /items-only
 * Get flat list of inventory items (variants only, no grouping)
 * @query {number} [page=1] - Page number
 * @query {number} [perPage=10] - Items per page
 * @query {string} [search] - Search term
 * @query {string} [filter] - Filter type
 */
router.get('/items-only', InventoryController.getInventoryItemsOnly);

/**
 * GET /search
 * Search inventory items by name, description, or barcode
 * @query {string} q - Search query string
 */
router.get('/search', InventoryController.searchInventoryItems);

/**
 * GET /low-stock
 * Get items with quantity below threshold
 * @query {number} [threshold=10] - Stock level threshold
 */
router.get('/low-stock', InventoryController.getLowStockItems);

/**
 * GET /item/:itemId
 * Get a single inventory item by variant ID or product ID
 * @param {string} itemId - Variant UUID or Product UUID
 */
router.get('/item/:itemId', InventoryController.getInventoryItem);

/**
 * GET /barcode/:barcode
 * Find inventory item by barcode (primary or additional)
 * @param {string} barcode - Barcode string to search
 */
router.get('/barcode/:barcode', InventoryController.findInventoryItemByBarcode);

/**
 * GET /category/:categoryId
 * Get all inventory items in a specific category
 * @param {string} categoryId - Category UUID
 */
router.get('/category/:categoryId', InventoryController.getInventoryItemsByCategory);

/**
 * GET /status/:status
 * Get inventory items by status
 * @param {string} status - Status: active, inactive, void
 */
router.get('/status/:status', InventoryController.getInventoryItemsByStatus);

/**
 * POST /item/sku
 * Find inventory item by SKU code
 * @body {string} sku - SKU code to search
 */
router.post('/item/sku', InventoryController.findInventoryItemBySku);

/**
 * GET /exists/:itemId
 * Check if an inventory item exists
 * @param {string} itemId - Variant UUID to check
 */
router.get('/exists/:itemId', InventoryController.checkInventoryItemExists);

/**
 * POST /item
 * Create a new inventory item (product with variants)
 * @body {object} inventoryData - Product/variant data including name, variants[], categoryId, etc.
 */
router.post('/item', InventoryController.createInventoryItem);

/**
 * PUT /item/:itemId
 * Update an inventory item (variant or product with variants)
 * @param {string} itemId - Variant UUID or Product UUID
 * @body {object} updateData - Fields to update
 */
router.put('/item/:itemId', InventoryController.updateInventoryItem);

/**
 * PUT /bulk-update
 * Bulk update multiple inventory items
 * @body {Array<{productUuid: string, data: object}>} updates - Array of update operations
 */
router.put('/bulk-update', InventoryController.bulkUpdateInventoryItems);

/**
 * PATCH /item/:itemId/quantity
 * Update inventory quantity to a specific value (via stock adjustment)
 * @param {string} itemId - Variant UUID
 * @body {number} quantity - New absolute quantity
 */
router.patch('/item/:itemId/quantity', InventoryController.updateInventoryQuantity);

/**
 * PATCH /item/:itemId/adjust
 * Adjust inventory by a delta amount (+/-)
 * @param {string} itemId - Variant UUID
 * @body {number} adjustment - Quantity to add (positive) or subtract (negative)
 */
router.patch('/item/:itemId/adjust', InventoryController.adjustInventory);

/**
 * PUT /move-to-category
 * Move multiple inventory items to a different category
 * @body {string[]} productUuids - Array of variant/product UUIDs to move
 * @body {string} categoryId - Target category UUID
 */
router.put('/move-to-category', InventoryController.moveToCategory);

/**
 * POST /sync-category-counts
 * Synchronize item counts for all categories
 */
router.post('/sync-category-counts', InventoryController.syncCategoryItemCounts);

/**
 * PUT /item-void/:itemId
 * Soft delete (void) an inventory item
 * @param {string} itemId - Variant UUID to void
 */
router.put('/item-void/:itemId', InventoryController.voidInventoryItem);

/**
 * DELETE /item/:itemId
 * Permanently delete an inventory item
 * @param {string} itemId - Variant UUID to delete
 */
router.delete('/item/:itemId', InventoryController.deleteInventoryItem);

/**
 * PUT /item/:variantId/convert-to-variant
 * Convert a variant to become a variant of a different product.
 * This allows moving an existing product's variant to become a variant of another product.
 * 
 * Use cases:
 * - Moving a standalone product to become a variant of another product
 * - Reorganizing variants between products
 * 
 * @param {string} variantId - The variant UUID to convert/move
 * @body {string} targetProductId - The product UUID to move the variant to (required)
 * @body {string} [variantName] - Optional new name for the variant
 * @body {boolean} [deleteOrphanedProduct=true] - Whether to delete the original product if it becomes orphaned (has no more variants)
 * 
 * @returns {object} - { variant: ProductWithInventory, orphanedProductDeleted: boolean, deletedProductId?: string }
 */
router.put('/item/:variantId/convert-to-variant', InventoryController.convertToVariant);

export default router;
