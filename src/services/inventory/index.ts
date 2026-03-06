/**
 * Inventory Services - Centralized export for inventory-related operations
 * 
 * CODE STRUCTURE RECOMMENDATIONS:
 * ===============================
 * 
 * 1. SERVICE LAYER PATTERN
 *    The inventory system is organized into specialized services:
 *    
 *    ┌─────────────────────────────────────────────────────────────────┐
 *    │                     HIGH-LEVEL SERVICES                        │
 *    │  (Business logic, validation, orchestration)                   │
 *    ├─────────────────────────────────────────────────────────────────┤
 *    │  SaleService          - Process sales, void sales              │
 *    │  ReturnService        - Process returns                        │
 *    │  PurchaseOrderService - Receive inventory                      │
 *    │  InventoryService     - Queries, reporting, management         │
 *    └──────────────────────────┬──────────────────────────────────────┘
 *                               │
 *                               ▼
 *    ┌─────────────────────────────────────────────────────────────────┐
 *    │              STOCK MOVEMENT SERVICE (Core)                     │
 *    │  Single source of truth for ALL quantity changes               │
 *    │  - recordSale()          - recordReturn()                      │
 *    │  - recordPurchaseReceipt() - recordAdjustment()                │
 *    │  - recordTransfer()      - recordDamage() / recordExpiry()     │
 *    │  - syncMovementsFromOffline() - recalculateInventory()         │
 *    └──────────────────────────┬──────────────────────────────────────┘
 *                               │
 *                               ▼
 *    ┌─────────────────────────────────────────────────────────────────┐
 *    │                   DATABASE LAYER                               │
 *    │  StockMovement (immutable ledger) + Inventory (cache)          │
 *    └─────────────────────────────────────────────────────────────────┘
 * 
 * 2. IMMUTABILITY ENFORCEMENT
 *    StockMovement records are NEVER updated or deleted.
 *    
 *    To enforce at database layer:
 *    - MySQL: Create triggers to prevent UPDATE/DELETE on stock_movements
 *    - SQLite: Application-level enforcement (no direct update/delete methods)
 *    - Prisma: No update() or delete() calls on stockMovement model
 *    
 *    Example MySQL trigger:
 *    ```sql
 *    DELIMITER //
 *    CREATE TRIGGER prevent_stock_movement_update
 *    BEFORE UPDATE ON stock_movements
 *    FOR EACH ROW
 *    BEGIN
 *        SIGNAL SQLSTATE '45000'
 *        SET MESSAGE_TEXT = 'Stock movements are immutable and cannot be updated';
 *    END//
 *    
 *    CREATE TRIGGER prevent_stock_movement_delete
 *    BEFORE DELETE ON stock_movements
 *    FOR EACH ROW
 *    BEGIN
 *        SIGNAL SQLSTATE '45000'
 *        SET MESSAGE_TEXT = 'Stock movements are immutable and cannot be deleted';
 *    END//
 *    DELIMITER ;
 *    ```
 * 
 * 3. ATOMIC TRANSACTIONS
 *    All inventory operations use Prisma transactions:
 *    
 *    ```typescript
 *    await prisma.$transaction(async (tx) => {
 *        // Create sale
 *        const sale = await tx.sale.create({ ... });
 *        // Create sale items
 *        await tx.saleItem.createMany({ ... });
 *        // Record stock movements (via StockMovementService)
 *        await StockMovementService.recordSale({ ... }, tx);
 *    });
 *    ```
 *    
 *    Notes:
 *    - SQLite may not support nested transactions
 *    - In offline mode, all changes are written together in single batch
 *    - Pass `tx` (Prisma transaction client) to StockMovementService methods
 * 
 * USAGE EXAMPLES:
 * ===============
 * 
 * // Process a sale (recommended - handles everything)
 * import { SaleService } from './sale.service';
 * const sale = await SaleService.createSale(saleData, tenantId, branchId);
 * 
 * // Void a sale (creates compensating movements)
 * await SaleService.voidSale(saleId, { voidReason: 'Customer refund', voidedBy: userId }, tenantId, branchId);
 * 
 * // Direct stock movement (for custom scenarios)
 * import { StockMovementService } from './stock-movement.service';
 * await StockMovementService.recordAdjustment({
 *     tenantId, branchId, inventoryId,
 *     quantity: 10,  // positive = increase, negative = decrease
 *     notes: 'Stock count adjustment',
 *     movedBy: userId
 * });
 * 
 * // Stock count reconciliation
 * await StockMovementService.recordStockCount({
 *     tenantId, branchId, inventoryId,
 *     actualQuantity: 50,  // System will calculate variance
 *     movedBy: userId
 * });
 * 
 * // Sync from offline terminal
 * const result = await StockMovementService.syncMovementsFromOffline(movements);
 * // result: { inserted: 5, skipped: 2, inventoriesRecalculated: 3 }
 * 
 * // Verify inventory after sync
 * const { wasCorrected } = await StockMovementService.recalculateInventory(inventoryId);
 */

// Core inventory services
export { StockMovementService } from '../stock-movement.service';
export { InventoryService } from '../inventory.service';

// Business operation services
export { SaleService } from '../sale.service';
export { ReturnService } from '../return.service';
export { PurchaseOrderService } from '../purchase-order.service';

// Types
export type {
    CreateStockMovementInput,
    SyncMovementInput,
    BulkSyncResult,
    StockMovementWithProduct,
} from '../../models/stock-movement.model';
