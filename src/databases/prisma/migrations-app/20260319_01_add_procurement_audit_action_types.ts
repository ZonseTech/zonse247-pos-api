/**
 * Migration: 20260319_01
 * Description: Add procurement-specific action types to AuditLogActionType enum
 *
 * Adds: approve, reject, send, receive, post, verify, cancel, void, dispute, pay
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260319_01',
    description: 'Add procurement action types to AuditLogActionType enum',
    up: {
        sqlite: [
            // SQLite doesn't enforce enum constraints — values stored as text
            // No schema change needed; new values work automatically
        ],
        mysql: [
            `ALTER TABLE \`audit_logs\` MODIFY COLUMN \`action_type\` ENUM('create','update','delete','login','logout','access','export','import','backup','sync','approve','reject','send','receive','post','verify','cancel','void','dispute','pay') NOT NULL`,
        ],
    },
    down: {
        sqlite: [],
        mysql: [
            `ALTER TABLE \`audit_logs\` MODIFY COLUMN \`action_type\` ENUM('create','update','delete','login','logout','access','export','import','backup','sync') NOT NULL`,
        ],
    },
};
