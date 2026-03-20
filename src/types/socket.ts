/**
 * @file    Socket.IO type definitions
 * @desc    Shared types for WebSocket events, payloads, and state management
 *          Used by both the server (API) and client (Frontend/Electron)
 */

// ─── Terminal Presence ───────────────────────────────────────────────

export type TerminalOnlineStatus = 'online' | 'offline' | 'idle';

export interface ConnectedTerminal {
    terminalId: string;
    tenantId: string;
    branchId: string;
    userId: string;
    username: string;
    terminalLabel: string;
    status: TerminalOnlineStatus;
    connectedAt: Date;
    lastHeartbeat: Date;
    socketId: string;
    metadata?: TerminalMetadata;
}

export interface TerminalMetadata {
    deviceId?: string;
    osName?: string;
    osVersion?: string;
    appVersion?: string;
    ipAddress?: string;
}

// ─── Server Status ──────────────────────────────────────────────────

export interface ServerStatus {
    status: 'healthy' | 'degraded' | 'maintenance';
    uptime: number;
    connectedTerminals: number;
    version: string;
    timestamp: string;
    environment: string;
}

// ─── Socket Auth ────────────────────────────────────────────────────

export interface SocketAuthPayload {
    token: string;
    terminalId: string;
    branchId: string;
    tenantId: string;
    terminalLabel?: string;
    metadata?: TerminalMetadata;
}

export interface SocketAuthUser {
    userId: string;
    tenantId: string;
    branchId: string;
    username: string;
    roleId: string;
    terminalId: string;
    terminalLabel: string;
}

// ─── Event Payloads ─────────────────────────────────────────────────

export interface TerminalStatusChangePayload {
    terminalId: string;
    terminalLabel: string;
    status: TerminalOnlineStatus;
    userId: string;
    username: string;
    timestamp: string;
    branchId: string;
    tenantId: string;
}

export interface HeartbeatPayload {
    terminalId: string;
    timestamp: string;
    activeSaleId?: string;
    currentScreen?: string;
}

export interface HeartbeatAck {
    received: boolean;
    serverTime: string;
    nextExpectedIn: number;
}

export interface BranchNotification {
    type: 'sale' | 'stock_update' | 'price_change' | 'sync' | 'announcement' | 'alert';
    title: string;
    message: string;
    data?: Record<string, unknown>;
    priority: 'low' | 'normal' | 'high' | 'critical';
    timestamp: string;
    sourceTerminalId?: string;
}

export interface TerminalListRequest {
    branchId?: string;
}

export interface TerminalListResponse {
    terminals: ConnectedTerminal[];
    totalOnline: number;
    totalOffline: number;
}

export interface ForceDisconnectPayload {
    reason: string;
    reconnectAllowed: boolean;
}

// ─── Event Maps (Socket.IO typed events) ────────────────────────────

/**
 * Events the CLIENT can emit TO the server
 */
export interface ClientToServerEvents {
    'terminal:heartbeat': (payload: HeartbeatPayload, callback: (ack: HeartbeatAck) => void) => void;
    'terminal:status_change': (payload: { status: TerminalOnlineStatus }) => void;
    'terminal:list': (payload: TerminalListRequest, callback: (response: TerminalListResponse) => void) => void;
    'server:status': (callback: (status: ServerStatus) => void) => void;
    'branch:notification': (payload: BranchNotification) => void;
}

/**
 * Events the SERVER can emit TO the client
 */
export interface ServerToClientEvents {
    'terminal:online': (payload: TerminalStatusChangePayload) => void;
    'terminal:offline': (payload: TerminalStatusChangePayload) => void;
    'terminal:idle': (payload: TerminalStatusChangePayload) => void;
    'terminal:list_update': (payload: TerminalListResponse) => void;
    'server:status': (payload: ServerStatus) => void;
    'server:maintenance': (payload: { message: string; estimatedDowntime?: number }) => void;
    'branch:notification': (payload: BranchNotification) => void;
    'terminal:force_disconnect': (payload: ForceDisconnectPayload) => void;
}

/**
 * Events between servers (for scaling with adapters)
 */
export interface InterServerEvents {
    ping: () => void;
}

/**
 * Data stored on each socket instance
 */
export interface SocketData {
    user: SocketAuthUser;
    terminalId: string;
    tenantId: string;
    branchId: string;
    connectedAt: Date;
}
