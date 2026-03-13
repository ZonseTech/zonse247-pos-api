import { EventEmitter } from 'events';
import { MraEnvironment } from '../../types/mra.types';

/**
 * MRA Event Types
 */
export enum MraEventType {
    TERMINAL_ACTIVATED = 'mra:terminal:activated',
    TERMINAL_DEACTIVATED = 'mra:terminal:deactivated',
    CONFIG_SYNCED = 'mra:config:synced',
    COMPLIANCE_ENABLED = 'mra:compliance:enabled',
    COMPLIANCE_DISABLED = 'mra:compliance:disabled',
}

/**
 * Event payload for terminal activation
 */
export interface MraTerminalActivatedEvent {
    tenantId: string;
    branchId: string;
    terminalId: string;
    mraTerminalId: string;
    environment: MraEnvironment;
    taxpayerInfo?: {
        tin?: string;
        taxpayerName?: string;
        tradeName?: string;
        address?: string;
    };
}

/**
 * Event payload for terminal deactivation
 */
export interface MraTerminalDeactivatedEvent {
    tenantId: string;
    terminalId: string;
    mraTerminalId: string;
    environment: MraEnvironment;
}

/**
 * Event payload for config sync
 */
export interface MraConfigSyncedEvent {
    tenantId: string;
    terminalId: string;
    environment: MraEnvironment;
    configVersion?: string;
}

/**
 * Event payload for compliance state changes
 */
export interface MraComplianceChangedEvent {
    tenantId: string;
    enabled: boolean;
    environment: MraEnvironment;
}

/**
 * MRA Event Emitter Singleton
 */
class MraEventEmitter extends EventEmitter {
    private static instance: MraEventEmitter;

    private constructor() {
        super();
        // Set max listeners to avoid memory leak warnings for many handlers
        this.setMaxListeners(20);
    }

    static getInstance(): MraEventEmitter {
        if (!MraEventEmitter.instance) {
            MraEventEmitter.instance = new MraEventEmitter();
        }
        return MraEventEmitter.instance;
    }

    /**
     * Emit terminal activated event
     */
    emitTerminalActivated(data: MraTerminalActivatedEvent): void {
        console.log('[MRA Events] Terminal activated:', data.terminalId);
        this.emit(MraEventType.TERMINAL_ACTIVATED, data);
    }

    /**
     * Emit terminal deactivated event
     */
    emitTerminalDeactivated(data: MraTerminalDeactivatedEvent): void {
        console.log('[MRA Events] Terminal deactivated:', data.terminalId);
        this.emit(MraEventType.TERMINAL_DEACTIVATED, data);
    }

    /**
     * Emit config synced event
     */
    emitConfigSynced(data: MraConfigSyncedEvent): void {
        console.log('[MRA Events] Config synced for terminal:', data.terminalId);
        this.emit(MraEventType.CONFIG_SYNCED, data);
    }

    /**
     * Emit compliance enabled event
     */
    emitComplianceEnabled(data: MraComplianceChangedEvent): void {
        console.log('[MRA Events] Compliance enabled for tenant:', data.tenantId);
        this.emit(MraEventType.COMPLIANCE_ENABLED, data);
    }

    /**
     * Emit compliance disabled event
     */
    emitComplianceDisabled(data: MraComplianceChangedEvent): void {
        console.log('[MRA Events] Compliance disabled for tenant:', data.tenantId);
        this.emit(MraEventType.COMPLIANCE_DISABLED, data);
    }
}

// Export singleton instance
export const mraEvents = MraEventEmitter.getInstance();

/**
 * MRA Events Service
 * 
 * Provides methods to register event handlers.
 */
export class MraEventsService {
    /**
     * Register handler for terminal activated event
     */
    static onTerminalActivated(handler: (data: MraTerminalActivatedEvent) => void | Promise<void>): void {
        mraEvents.on(MraEventType.TERMINAL_ACTIVATED, async (data) => {
            try {
                await handler(data);
            } catch (error) {
                console.error('[MRA Events] Error in terminal activated handler:', error);
            }
        });
    }

    /**
     * Register handler for terminal deactivated event
     */
    static onTerminalDeactivated(handler: (data: MraTerminalDeactivatedEvent) => void | Promise<void>): void {
        mraEvents.on(MraEventType.TERMINAL_DEACTIVATED, async (data) => {
            try {
                await handler(data);
            } catch (error) {
                console.error('[MRA Events] Error in terminal deactivated handler:', error);
            }
        });
    }

    /**
     * Register handler for config synced event
     */
    static onConfigSynced(handler: (data: MraConfigSyncedEvent) => void | Promise<void>): void {
        mraEvents.on(MraEventType.CONFIG_SYNCED, async (data) => {
            try {
                await handler(data);
            } catch (error) {
                console.error('[MRA Events] Error in config synced handler:', error);
            }
        });
    }

    /**
     * Register handler for compliance enabled event
     */
    static onComplianceEnabled(handler: (data: MraComplianceChangedEvent) => void | Promise<void>): void {
        mraEvents.on(MraEventType.COMPLIANCE_ENABLED, async (data) => {
            try {
                await handler(data);
            } catch (error) {
                console.error('[MRA Events] Error in compliance enabled handler:', error);
            }
        });
    }

    /**
     * Register handler for compliance disabled event
     */
    static onComplianceDisabled(handler: (data: MraComplianceChangedEvent) => void | Promise<void>): void {
        mraEvents.on(MraEventType.COMPLIANCE_DISABLED, async (data) => {
            try {
                await handler(data);
            } catch (error) {
                console.error('[MRA Events] Error in compliance disabled handler:', error);
            }
        });
    }
}
