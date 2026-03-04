/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * MRA Services Index
 * 
 * Re-exports all MRA service modules for convenient importing.
 * 
 * Usage:
 * ```typescript
 * import { 
 *   MraOnboardingService, 
 *   MraSalesService,
 *   MraConfigurationService 
 * } from './services/mra';
 * ```
 */

// Base service with shared utilities
export { MraBaseService } from './base.service';

// Configuration management
export { MraConfigurationService } from './configuration.service';

// Terminal onboarding and activation
export { MraOnboardingService } from './onboarding.service';

// Sales and invoicing
export { MraSalesService } from './sales.service';

// Stock and product management
export { MraStockService } from './stock.service';

// Utility functions
export { MraUtilitiesService } from './utilities.service';

// Offline sync management
export { MraOfflineSyncService } from './offline-sync.service';

// Re-export MraBaseService as MraService for backwards compatibility
export { MraBaseService as MraService } from './base.service';
