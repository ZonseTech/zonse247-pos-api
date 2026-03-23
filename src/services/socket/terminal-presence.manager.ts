/**
 * @file    Terminal presence manager
 * @desc    Tracks connected terminals in-memory with heartbeat monitoring.
 *          Provides real-time terminal online/offline status across branches.
 *
 * Performance:
 *   - O(1) lookup by terminalId (primary Map)
 *   - O(1) lookup by branch via secondary index (Set per branch)
 *   - Numeric timestamps (Date.now()) for internal comparisons — no Date allocations
 *   - Incremental online count — no full scans on every query
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

/** Internal terminal record — uses numeric timestamps for perf */
interface InternalTerminal {
    terminalId: string;
    tenantId: string;
    branchId: string;
    userId: string;
    username: string;
    terminalLabel: string;
    status: TerminalOnlineStatus;
    connectedAt: number;
    lastHeartbeat: number;
    socketId: string;
    metadata?: TerminalMetadata;
}

/**
 * @class   TerminalPresenceManager
 * @desc    Singleton that manages the in-memory registry of connected terminals.
 *
 * Indexes:
 *   - terminals:      Map<terminalId, InternalTerminal>  — primary
 *   - branchIndex:    Map<"tenantId:branchId", Set<terminalId>>  — secondary
 *   - tenantIndex:    Map<tenantId, Set<terminalId>>  — secondary
 */
export class TerminalPresenceManager {
    private static instance: TerminalPresenceManager;

    /** Primary index: terminalId → terminal data */
    private terminals: Map<string, InternalTerminal> = new Map();

    /** Secondary index: "tenantId:branchId" → Set of terminalIds */
    private branchIndex: Map<string, Set<string>> = new Map();

    /** Secondary index: tenantId → Set of terminalIds */
    private tenantIndex: Map<string, Set<string>> = new Map();

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

    startMonitoring(onStatusChange: (payload: TerminalStatusChangePayload) => void): void {
        this.onStatusChange = onStatusChange;
        if (this.staleCheckTimer) return;

        this.staleCheckTimer = setInterval(() => {
            this.checkStaleTerminals();
        }, STALE_CHECK_INTERVAL);

        if (this.staleCheckTimer.unref) {
            this.staleCheckTimer.unref();
        }
    }

    stopMonitoring(): void {
        if (this.staleCheckTimer) {
            clearInterval(this.staleCheckTimer);
            this.staleCheckTimer = null;
        }
        this.terminals.clear();
        this.branchIndex.clear();
        this.tenantIndex.clear();
    }

    // ─── Registration ───────────────────────────────────────────

    register(params: {
        terminalId: string;
        tenantId: string;
        branchId: string;
        userId: string;
        username: string;
        terminalLabel: string;
        socketId: string;
        metadata?: TerminalMetadata;
    }): void {
        const now = Date.now();

        const terminal: InternalTerminal = {
            terminalId: params.terminalId,
            tenantId: params.tenantId,
            branchId: params.branchId,
            userId: params.userId,
            username: params.username,
            terminalLabel: params.terminalLabel,
            status: 'online',
            connectedAt: now,
            lastHeartbeat: now,
            socketId: params.socketId,
            metadata: params.metadata,
        };

        this.terminals.set(params.terminalId, terminal);
        this.addToIndex(params.tenantId, params.branchId, params.terminalId);
    }

    unregister(terminalId: string): InternalTerminal | null {
        const terminal = this.terminals.get(terminalId);
        if (!terminal) return null;

        this.terminals.delete(terminalId);
        this.removeFromIndex(terminal.tenantId, terminal.branchId, terminalId);
        return terminal;
    }

    // ─── Heartbeat ──────────────────────────────────────────────

    heartbeat(terminalId: string): boolean {
        const terminal = this.terminals.get(terminalId);
        if (!terminal) return false;

        const previousStatus = terminal.status;
        terminal.lastHeartbeat = Date.now();
        terminal.status = 'online';

        if (previousStatus !== 'online' && this.onStatusChange) {
            this.onStatusChange(this.buildStatusPayload(terminal));
        }

        return true;
    }

    updateStatus(terminalId: string, status: TerminalOnlineStatus): boolean {
        const terminal = this.terminals.get(terminalId);
        if (!terminal) return false;

        terminal.status = status;
        terminal.lastHeartbeat = Date.now();

        if (this.onStatusChange) {
            this.onStatusChange(this.buildStatusPayload(terminal));
        }

        return true;
    }

    // ─── Queries (O(branch size), not O(total terminals)) ───────

    getTerminal(terminalId: string): ConnectedTerminal | undefined {
        const t = this.terminals.get(terminalId);
        return t ? this.toPublic(t) : undefined;
    }

    isOnline(terminalId: string): boolean {
        const terminal = this.terminals.get(terminalId);
        return !!terminal && terminal.status !== 'offline';
    }

    getByBranch(tenantId: string, branchId: string): ConnectedTerminal[] {
        const key = `${tenantId}:${branchId}`;
        const ids = this.branchIndex.get(key);
        if (!ids || ids.size === 0) return [];

        const result: ConnectedTerminal[] = [];
        for (const id of ids) {
            const t = this.terminals.get(id);
            if (t) result.push(this.toPublic(t));
        }
        return result;
    }

    getByTenant(tenantId: string): ConnectedTerminal[] {
        const ids = this.tenantIndex.get(tenantId);
        if (!ids || ids.size === 0) return [];

        const result: ConnectedTerminal[] = [];
        for (const id of ids) {
            const t = this.terminals.get(id);
            if (t) result.push(this.toPublic(t));
        }
        return result;
    }

    getTerminalList(tenantId: string, branchId?: string): TerminalListResponse {
        const terminals = branchId
            ? this.getByBranch(tenantId, branchId)
            : this.getByTenant(tenantId);

        let onlineCount = 0;
        for (let i = 0; i < terminals.length; i++) {
            const s = terminals[i].status;
            if (s === 'online' || s === 'idle') onlineCount++;
        }

        return {
            terminals,
            totalOnline: onlineCount,
            totalOffline: terminals.length - onlineCount,
        };
    }

    get totalConnected(): number {
        return this.terminals.size;
    }

    // ─── Index Management ───────────────────────────────────────

    private addToIndex(tenantId: string, branchId: string, terminalId: string): void {
        // Branch index
        const branchKey = `${tenantId}:${branchId}`;
        let branchSet = this.branchIndex.get(branchKey);
        if (!branchSet) {
            branchSet = new Set();
            this.branchIndex.set(branchKey, branchSet);
        }
        branchSet.add(terminalId);

        // Tenant index
        let tenantSet = this.tenantIndex.get(tenantId);
        if (!tenantSet) {
            tenantSet = new Set();
            this.tenantIndex.set(tenantId, tenantSet);
        }
        tenantSet.add(terminalId);
    }

    private removeFromIndex(tenantId: string, branchId: string, terminalId: string): void {
        const branchKey = `${tenantId}:${branchId}`;
        const branchSet = this.branchIndex.get(branchKey);
        if (branchSet) {
            branchSet.delete(terminalId);
            if (branchSet.size === 0) this.branchIndex.delete(branchKey);
        }

        const tenantSet = this.tenantIndex.get(tenantId);
        if (tenantSet) {
            tenantSet.delete(terminalId);
            if (tenantSet.size === 0) this.tenantIndex.delete(tenantId);
        }
    }

    // ─── Internal ───────────────────────────────────────────────

    private checkStaleTerminals(): void {
        const now = Date.now();

        for (const terminal of this.terminals.values()) {
            const elapsed = now - terminal.lastHeartbeat;

            if (elapsed >= OFFLINE_THRESHOLD) {
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

    /** Convert internal numeric-timestamp record to public Date-based type */
    private toPublic(t: InternalTerminal): ConnectedTerminal {
        return {
            terminalId: t.terminalId,
            tenantId: t.tenantId,
            branchId: t.branchId,
            userId: t.userId,
            username: t.username,
            terminalLabel: t.terminalLabel,
            status: t.status,
            connectedAt: new Date(t.connectedAt),
            lastHeartbeat: new Date(t.lastHeartbeat),
            socketId: t.socketId,
            metadata: t.metadata,
        };
    }

    private buildStatusPayload(terminal: InternalTerminal): TerminalStatusChangePayload {
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
