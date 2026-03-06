/**
 * Migration: 20260307_01
 * Description: Add triggers to enforce StockMovement immutability (MySQL only)
 * 
 * IMMUTABLE LEDGER PRINCIPLE:
 * StockMovement records form an immutable audit trail.
 * They should NEVER be updated or deleted.
 * 
 * This migration adds database-level triggers to prevent:
 * - UPDATE operations on stock_movements
 * - DELETE operations on stock_movements (except soft delete via deletedAt)
 * 
 * Note: SQLite does not support this type of trigger reliably,
 * so immutability is enforced at the application level for SQLite.
 * The StockMovementService does not expose update/delete methods.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260307_01',
    description: 'Add triggers to enforce StockMovement immutability (MySQL only)',
    up: {
        sqlite: [
            // SQLite: Application-level enforcement only
            // StockMovementService does not expose update/delete methods
            `SELECT 1`, // No-op for SQLite
        ],
        mysql: [
            // Drop existing triggers if they exist (idempotent)
            `DROP TRIGGER IF EXISTS prevent_stock_movement_update`,
            `DROP TRIGGER IF EXISTS prevent_stock_movement_hard_delete`,

            // Prevent UPDATE on stock_movements (immutable ledger)
            // Note: soft delete (setting deleted_at) IS allowed
            `CREATE TRIGGER prevent_stock_movement_update
            BEFORE UPDATE ON stock_movements
            FOR EACH ROW
            BEGIN
                -- Only allow updates to deleted_at (soft delete) and updated_at
                IF (OLD.movement_type <> NEW.movement_type OR
                    OLD.quantity <> NEW.quantity OR
                    OLD.previous_quantity <> NEW.previous_quantity OR
                    OLD.new_quantity <> NEW.new_quantity OR
                    OLD.reference_type <> NEW.reference_type OR
                    OLD.reference_id <> NEW.reference_id OR
                    OLD.unit_cost <> NEW.unit_cost OR
                    OLD.total_cost <> NEW.total_cost OR
                    OLD.moved_by <> NEW.moved_by OR
                    OLD.movement_date <> NEW.movement_date) THEN
                    SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Stock movements are immutable. Use compensating movements for corrections.';
                END IF;
            END`,

            // Prevent hard DELETE on stock_movements (use soft delete instead)
            `CREATE TRIGGER prevent_stock_movement_hard_delete
            BEFORE DELETE ON stock_movements
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Stock movements cannot be deleted. Use soft delete (set deleted_at) or compensating movements.';
            END`,
        ],
    },
    down: {
        sqlite: [
            `SELECT 1`, // No-op for SQLite
        ],
        mysql: [
            `DROP TRIGGER IF EXISTS prevent_stock_movement_update`,
            `DROP TRIGGER IF EXISTS prevent_stock_movement_hard_delete`,
        ],
    },
};
