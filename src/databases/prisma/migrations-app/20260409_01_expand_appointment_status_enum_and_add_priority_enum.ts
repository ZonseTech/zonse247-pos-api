/**
 * Migration: 20260409_01
 * Description: Expand AppointmentStatus enum (add CONFIRMED, DISPATCHED, RESCHEDULED; remove CHECKED_IN) and add AppointmentPriority enum + priority column
 *
 * Changes:
 * 1. MySQL: ALTER appointments.status ENUM to new values
 * 2. MySQL: Add priority column with AppointmentPriority enum (LOW, NORMAL, HIGH, URGENT)
 * 3. SQLite: Add priority column (TEXT, no enum change needed)
 * 4. Migrate existing CHECKED_IN rows to CONFIRMED
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260409_01',
    description: 'Expand AppointmentStatus enum (add CONFIRMED, DISPATCHED, RESCHEDULED; remove CHECKED_IN) and add AppointmentPriority enum + priority column',
    up: {
        mysql: [
            // Migrate any existing CHECKED_IN rows before altering the enum
            `UPDATE appointments SET status = 'CONFIRMED' WHERE status = 'CHECKED_IN'`,
            // Alter status enum to new values
            `ALTER TABLE appointments MODIFY COLUMN status ENUM('SCHEDULED', 'CONFIRMED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED') NOT NULL DEFAULT 'SCHEDULED'`,
            // Add priority column
            `ALTER TABLE appointments ADD COLUMN priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL'`,
            // Index on priority for filtering
            `CREATE INDEX idx_appointments_priority ON appointments (priority)`,
        ],
        sqlite: [
            // Migrate any existing CHECKED_IN rows
            `UPDATE "appointments" SET "status" = 'CONFIRMED' WHERE "status" = 'CHECKED_IN'`,
            // Add priority column (TEXT in SQLite, validated at app level)
            `ALTER TABLE "appointments" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL'`,
            // Index on priority for filtering
            `CREATE INDEX IF NOT EXISTS "idx_appointments_priority" ON "appointments"("priority")`,
        ],
    },
    down: {
        mysql: [
            `DROP INDEX idx_appointments_priority ON appointments`,
            `ALTER TABLE appointments DROP COLUMN priority`,
            // Restore original enum
            `ALTER TABLE appointments MODIFY COLUMN status ENUM('SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED'`,
        ],
        sqlite: [
            `DROP INDEX IF EXISTS "idx_appointments_priority"`,
            // SQLite doesn't support DROP COLUMN in older versions, but newer ones do
            `ALTER TABLE "appointments" DROP COLUMN "priority"`,
        ],
    },
};
