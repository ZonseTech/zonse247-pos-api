/**
 * @file    Terminal presence manager
 * @desc    Tracks connected terminals in-memory with heartbeat monitoring.
 *          Provides real-time terminal online/offline status across branches.
 */

import type {
    ConnectedTerminal,
    TerminalOnlineStatus,
    TerminalMetadata,
    TerminalListResponse,
    TerminalStatusChangePayload,
} from '../../types/socket';

/** How often we check for stale terminals (ms) */
const STALE_CHECK_INTERVAL = 30_000;

/** Terminal is "idle" after this many ms without a heartbeat */
const IDLE_THRESHOLD = 60_000;

/** Terminal is "offline" after this many ms without a heartbeat */
const OFFLINE_THRESHOLD = 120_000;

/**
 * @class   TerminalPresenceManager
 * @desc    Singleton that manages the in-memory registry of connected terminals.
 *          Indexed by terminalId for O(1) lookups.
 *
 * Usage:
 *   const presence = TerminalPresenceManager.getInstance();
 *   presence.register({ terminalId, ... });
 *   presence.getOnlineTerminals(branchId);
 */
export class TerminalPresenceManager {
    private static instance: TerminalPresenceManager;
    private terminals: Map<string, ConnectedTerminal> = new Map();
    private staleCheckTimer: ReturnType<typeof setInterval> | null = null;
    private onStatusChange?: (payload: TerminalStatusChangePayload) => void;

    private constructor() {
        // Singleton — use getInstance()
    }

    static getInstance(): TerminalPresenceManager {
        if (!TerminalPresenceManager.instance) {
            TerminalPresenceManager.instance = new TerminalPresenceManager();
        }
        return TerminalPresenceManager.instance;
    }

    // ─── Lifecycle ──────────────────────────────────────────────

    /**
     * Start periodic stale-terminal detection.
     * Call this once when the socket server initializes.
     */
    startMonitoring(onStatusChange: (payload: TerminalStatusChangePayload) => void): void {
        this.onStatusChange = onStatusChange;

        if (this.staleCheckTimer) return;

        this.staleCheckTimer = setInterval(() => {
            this.checkStaleTerminals();
        }, STALE_CHECK_INTERVAL);

        // Don't prevent Node from exiting
        if (this.staleCheckTimer.unref) {
            this.staleCheckTimer.unref();
        }
    }

    /**
     * Stop monitoring and clear all terminals.
     * Call this on server shutdown.
     */
    stopMonitoring(): void {
        if (this.staleCheckTimer) {
            clearInterval(this.staleCheckTimer);
            this.staleCheckTimer = null;
        }
        this.terminals.clear();
    }

    // ─── Registration ───────────────────────────────────────────

    /**
     * Register a terminal as online.
     */
    register(params: {
        terminalId: string;
        tenantId: string;
        branchId: string;
        userId: string;
        username: string;
        terminalLabel: string;
        socketId: string;
        metadata?: TerminalMetadata;
    }): ConnectedTerminal {
        const terminal: ConnectedTerminal = {
            terminalId: params.terminalId,
            tenantId: params.tenantId,
            branchId: params.branchId,
            userId: params.userId,
            username: params.username,
            terminalLabel: params.terminalLabel,
            status: 'online',
            connectedAt: new Date(),
            lastHeartbeat: new Date(),
            socketId: params.socketId,
            metadata: params.metadata,
        };

        this.terminals.set(params.terminalId, terminal);
        return terminal;
    }

    /**
     * Unregister a terminal (disconnected).
     * Returns the terminal data before removal, or null if not found.
     */
    unregister(terminalId: string): ConnectedTerminal | null {
        const terminal = this.terminals.get(terminalId);
        if (terminal) {
            this.terminals.delete(terminalId);
        }
        return terminal || null;
    }

    // ─── Heartbeat ──────────────────────────────────────────────

    /**
     * Update heartbeat timestamp for a terminal.
     * Resets status to 'online' if it was 'idle'.
     */
    heartbeat(terminalId: string): boolean {
        const terminal = this.terminals.get(terminalId);
        if (!terminal) return false;

        const previousStatus = terminal.status;
        terminal.lastHeartbeat = new Date();
        terminal.status = 'online';

        // If status changed from idle → online, notify
        if (previousStatus !== 'online' && this.onStatusChange) {
            this.onStatusChange(this.buildStatusPayload(terminal));
        }

        return true;
    }

    /**
     * Update terminal status explicitly (e.g. user sets idle).
     */
    updateStatus(terminalId: string, status: TerminalOnlineStatus): boolean {
        const terminal = this.terminals.get(terminalId);
        if (!terminal) return false;

        terminal.status = status;
        terminal.lastHeartbeat = new Date();

        if (this.onStatusChange) {
            this.onStatusChange(this.buildStatusPayload(terminal));
        }

        return true;
    }

    // ─── Queries ────────────────────────────────────────────────

    /**
     * Get a specific terminal's status.
     */
    getTerminal(terminalId: string): ConnectedTerminal | undefined {
        return this.terminals.get(terminalId);
    }

    /**
     * Check if a terminal is connected.
     */
    isOnline(terminalId: string): boolean {
        const terminal = this.terminals.get(terminalId);
        return !!terminal && terminal.status !== 'offline';
    }

    /**
     * Get all connected terminals for a branch.
     */
    getByBranch(tenantId: string, branchId: string): ConnectedTerminal[] {
        const result: ConnectedTerminal[] = [];
        for (const terminal of this.terminals.values()) {
            if (terminal.tenantId === tenantId && terminal.branchId === branchId) {
                result.push(terminal);
            }
        }
        return result;
    }

    /**
     * Get all connected terminals for a tenant.
     */
    getByTenant(tenantId: string): ConnectedTerminal[] {
        const result: ConnectedTerminal[] = [];
        for (const terminal of this.terminals.values()) {
            if (terminal.tenantId === tenantId) {
                result.push(terminal);
            }
        }
        return result;
    }

    /**
     * Build a TerminalListResponse for a branch scope.
     */
    getTerminalList(tenantId: string, branchId?: string): TerminalListResponse {
        const terminals = branchId
            ? this.getByBranch(tenantId, branchId)
            : this.getByTenant(tenantId);

        const online = terminals.filter(t => t.status === 'online' || t.status === 'idle');

        return {
            terminals,
            totalOnline: online.length,
            totalOffline: terminals.length - online.length,
        };
    }

    /**
     * Get total connected count.
     */
    get totalConnected(): number {
        return this.terminals.size;
    }

    // ─── Internal ───────────────────────────────────────────────

    /**
     * Check for terminals that haven't sent a heartbeat recently.
     * Transitions: online → idle → offline (removed).
     */
    private checkStaleTerminals(): void {
        const now = Date.now();

        for (const [_terminalId, terminal] of this.terminals) {
            const elapsed = now - terminal.lastHeartbeat.getTime();

            if (elapsed >= OFFLINE_THRESHOLD) {
                // Terminal is presumed offline — will be cleaned up on actual disconnect
                // but mark it so queries reflect the state
                if (terminal.status !== 'offline') {
                    terminal.status = 'offline';
                    if (this.onStatusChange) {
                        this.onStatusChange(this.buildStatusPayload(terminal));
                    }
                }
            } else if (elapsed >= IDLE_THRESHOLD && terminal.status === 'online') {
                terminal.status = 'idle';
                if (this.onStatusChange) {
                    this.onStatusChange(this.buildStatusPayload(terminal));
                }
            }
        }
    }

    private buildStatusPayload(terminal: ConnectedTerminal): TerminalStatusChangePayload {
        return {
            terminalId: terminal.terminalId,
            terminalLabel: terminal.terminalLabel,
            status: terminal.status,
            userId: terminal.userId,
            username: terminal.username,
            timestamp: new Date().toISOString(),
            branchId: terminal.branchId,
            tenantId: terminal.tenantId,
        };
    }
}
