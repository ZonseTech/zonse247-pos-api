import { StockMovementService } from '../../inventory/stock-movement.service';
import type { SyncMovementInput } from '../../../models/stock-movement.model';
import type { StockMovementSyncResult } from '../types/sync.types';

/**
 * Receive and process stock movements from terminal
 * 
 * This is the core of inventory sync - uses StockMovementService which:
 * - Detects and skips duplicates
 * - Creates inventory records if needed
 * - Recalculates inventory quantities
 */
export async function receiveStockMovements(
    movements: SyncMovementInput[]
): Promise<StockMovementSyncResult> {
    const syncResult = await StockMovementService.syncMovementsFromOffline(movements);

    return {
        success: syncResult.success,
        accepted: syncResult.inserted,
        rejected: syncResult.errors.length,
        skipped: syncResult.skipped,
        errors: syncResult.errors.map((e) => ({
            id: e.movementId,
            error: e.error,
        })),
        inventoriesRecalculated: syncResult.inventoriesRecalculated,
    };
}
