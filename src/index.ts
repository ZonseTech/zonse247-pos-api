export {
    SecureSettingsService,
} from './services/secure-settings.service';

export { DatabaseInitializer } from './databases/prisma/databaseInitializer';

export {
    initializeConfig,
    getConfig,
    updateConfig,
    type RuntimeConfig
} from './config/app.config';

export {
    PrintAgentService,
    type PrintAgentConfig,
    type PrintAgentStatus
} from './services/printer/print-agent.service';

export {
    AppPlatform,
    PrintErrorCode,
    PLATFORM_CAPABILITIES,
    type PlatformCapabilities,
    type PlatformPrintRequest,
    type PlatformPrintOptions,
    type PrintResult,
    type PlatformPrinter,
    type PrinterCapabilities,
    type PlatformDiscoveryRequest,
    type PlatformDiscoveryResult,
    type DiscoveredPlatformPrinter,
    type PrinterResponseDTO,
    type PrinterListResponseDTO,
    type PrintJobResponseDTO,
    type PrinterHealthResponseDTO,
    type QueueStatusResponseDTO,
    type PrintAgentStatusDTO,
    type PermissionsCheckDTO,
    type SetupInstructionsDTO
} from './types/printer.platform';

export {
    PrintStrategyFactory,
    PrintStrategySelector,
    PrintContext,
    initializePrintStrategies,
    ensureStrategiesInitialized
} from './services/printer/strategies';

export {
    SyncJobService,
    initSyncJob,
    getSyncJob,
    stopSyncJob,
    resetSyncTimestamps,
    SyncReceiverService
} from './services/sync';

import { Server } from './server';

export default Server;