import { prisma } from '../../../databases/prisma/client';
import type { SyncResult } from '../types/sync.types';
import {
    createEmptySyncResult,
    finalizeSyncResult,
    addSyncError,
    markSkipped,
    markAccepted,
    isNewerRecord,
    getErrorMessage,
} from './base.handler';

type UserSyncRecord = Record<string, unknown> & {
    id: string;
    userId?: string;
    tenantId?: string;
    branchId?: string;
    username?: string;
    password?: string;
    passwordChangedAt?: Date | string;
    updatedAt?: Date | string;
};

/**
 * Receive and upsert user credential/profile changes from terminal
 * 
 * Security considerations:
 * - Password is already bcrypt-hashed on the terminal side
 * - We use `passwordChangedAt` to resolve password conflicts (latest wins)
 * - Username changes use `updatedAt` for conflict resolution
 * - Only syncs non-sensitive profile fields and credential hashes
 */
export async function receiveUsers(
    users: UserSyncRecord[]
): Promise<SyncResult> {
    const result = createEmptySyncResult();

    for (const user of users) {
        try {
            const userId = getUserId(user);

            if (!userId) {
                addSyncError(result, 'unknown', 'Missing userId');
                continue;
            }

            if (!user.tenantId) {
                addSyncError(result, userId, 'Missing tenantId');
                continue;
            }

            const existing = await prisma.user.findUnique({
                where: { userId },
            });

            if (existing) {
                await handleExistingUser(result, user, userId, existing);
            } else {
                // Don't create new users via sync - users must be created
                // through the proper registration/admin flow
                markSkipped(result);
            }
        } catch (error) {
            addSyncError(result, user.userId || user.id, getErrorMessage(error));
        }
    }

    return finalizeSyncResult(result);
}

/**
 * Extract userId from record
 */
function getUserId(user: UserSyncRecord): string | undefined {
    return (user.userId || user.id) as string | undefined;
}

/**
 * Handle existing user - merge changes using field-level conflict resolution
 * 
 * Strategy:
 * - Password: latest `passwordChangedAt` wins (prevents old password overwriting new one)
 * - Username/profile: latest `updatedAt` wins
 * - Sensitive fields (roleId, status, accessibleBranches) only flow server → terminal (PULL)
 *   and are NOT accepted from terminal push to prevent privilege escalation
 */
async function handleExistingUser(
    result: SyncResult,
    incoming: UserSyncRecord,
    userId: string,
    existing: Record<string, any>
): Promise<void> {
    const updateData: Record<string, unknown> = {};
    let hasChanges = false;

    // Password conflict resolution: latest passwordChangedAt wins
    if (incoming.password && incoming.passwordChangedAt) {
        const incomingPwdAt = new Date(incoming.passwordChangedAt as string);
        const existingPwdAt = existing.passwordChangedAt
            ? new Date(existing.passwordChangedAt)
            : new Date(0);

        if (incomingPwdAt > existingPwdAt) {
            // Terminal's password change is newer - accept the already-hashed password
            updateData.password = incoming.password;
            updateData.passwordChangedAt = incomingPwdAt;
            updateData.forcePasswordChange = incoming.forcePasswordChange ?? false;
            hasChanges = true;
        }
    }

    // Profile fields: latest updatedAt wins
    if (isNewerRecord(incoming, existing)) {
        // Safe profile fields that terminals are allowed to push
        const safeFields = [
            'username', 'fullname', 'email', 'phone',
            'pinCode', 'currentBranchId',
        ];

        for (const field of safeFields) {
            if (incoming[field] !== undefined && incoming[field] !== existing[field]) {
                updateData[field] = incoming[field];
                hasChanges = true;
            }
        }

        if (hasChanges) {
            updateData.updatedAt = incoming.updatedAt
                ? new Date(incoming.updatedAt as string)
                : new Date();
        }
    }

    if (hasChanges) {
        await prisma.user.update({
            where: { userId },
            data: updateData as any,
        });
        markAccepted(result);
    } else {
        markSkipped(result);
    }
}
