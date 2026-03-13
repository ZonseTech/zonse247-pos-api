/* eslint-disable @typescript-eslint/no-var-requires */
export { MraBaseService } from './base.service';
export { MraConfigurationService } from './configuration.service';
export { MraOnboardingService } from './onboarding.service';
export { MraSalesService } from './sales.service';
export { MraStockService } from './stock.service';
export { MraUtilitiesService } from './utilities.service';
export { MraOfflineSyncService } from './offline-sync.service';
export { MraComplianceService } from './compliance.service';
export { MraEventsService, mraEvents, MraEventType } from './events.service';
export type {
    MraTerminalActivatedEvent,
    MraTerminalDeactivatedEvent,
    MraConfigSyncedEvent,
    MraComplianceChangedEvent
} from './events.service';

export { MraPostOnboardingService } from './post-onboarding.service';
export type { PostOnboardingSyncResult } from './post-onboarding.service';
export { MraBaseService as MraService } from './base.service';

/**
 * Initialize MRA services (event handlers for post-onboarding sync)
 * Only initializes for MySQL database (server deployments)
 * SQLite (desktop) skips MRA initialization for performance
 */
export function initializeMraServices(): void {
    const { DATABASE_TYPE } = require('../../databases/prisma/client');

    if (DATABASE_TYPE === 'sqlite') {
        console.log('[MRA] Skipping initialization (SQLite/desktop mode)');
        return;
    }

    const { MraPostOnboardingService } = require('./post-onboarding.service');
    MraPostOnboardingService.initialize();
    console.log('[MRA] Services initialized');
}
