/**
 * @file    Socket.IO server service
 * @desc    Core WebSocket server that initializes Socket.IO, manages connections,
 *          and provides a public API for emitting events from anywhere in the app.
 *
 *          Works in both cloud/server mode and Electron embedded mode.
 */

import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { getConfig } from '../../config/app.config';
import { socketAuthMiddleware } from './socket-auth.middleware';
import { TerminalPresenceManager } from './terminal-presence.manager';
import { RemoteHealthMonitor } from './remote-health.monitor';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    TerminalStatusChangePayload,
    ServerStatus,
    HeartbeatAck,
    BranchNotification,
} from '../../types/socket';

type AppSocketServer = SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

/** Heartbeat expected interval - client should send every 30s */
const HEARTBEAT_INTERVAL = 30_000;

/**
 * @class   SocketService
 * @desc    Manages the Socket.IO server lifecycle and provides a clean API
 *          for the rest of the application to emit real-time events.
 *
 * Architecture:
 *   - Rooms: `tenant:{id}`, `branch:{tenantId}:{branchId}`, `terminal:{id}`
 *   - Auth: JWT verified on handshake (same token as REST API)
 *   - Presence: TerminalPresenceManager tracks online/offline/idle state
 *   - Remote Health: Monitors sync server reachability (Electron/offline mode only)
 *
 * Deployment modes:
 *   - Cloud/Server: Remote health monitor is SKIPPED (clients connect directly to this server)
 *   - Electron/Offline: Remote health monitor pings the cloud sync server
 *
 * Performance:
 *   - WebSocket-first transport (skips polling upgrade overhead)
 *   - Per-message deflate disabled (POS payloads are small, compression overhead > savings)
 *   - Room-based targeting for all broadcasts (no socket iteration)
 *   - Remote health only broadcasts on state change, not every interval
 */
export class SocketService {
    private static instance: SocketService | null = null;
    private io: AppSocketServer | null = null;
    private presence: TerminalPresenceManager;
    private remoteHealth: RemoteHealthMonitor;

    private constructor() {
        this.presence = TerminalPresenceManager.getInstance();
        this.remoteHealth = RemoteHealthMonitor.getInstance();
    }

    /**
     * Get the singleton instance.
     */
    static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    /**
     * Get the raw Socket.IO server (for advanced use cases).
     */
    getIO(): AppSocketServer | null {
        return this.io;
    }

    /**
     * Get the presence manager for querying terminal status.
     */
    getPresence(): TerminalPresenceManager {
        return this.presence;
    }

    /**
     * Get the remote health monitor for querying remote server status.
     */
    getRemoteHealth(): RemoteHealthMonitor {
        return this.remoteHealth;
    }

    // ─── Lifecycle ──────────────────────────────────────────────

    /**
     * Initialize the Socket.IO server and attach it to the HTTP server.
     * Call this in Server.start() after the HTTP server is created.
     */
    initialize(httpServer: HttpServer): AppSocketServer {
        const config = getConfig();

        const allowedOrigins = config.corsAllowedOrigins
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean);

        this.io = new SocketServer<
            ClientToServerEvents,
            ServerToClientEvents,
            InterServerEvents,
            SocketData
        >(httpServer, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true,
            },
            // Performance & reliability
            pingInterval: HEARTBEAT_INTERVAL,
            pingTimeout: 10_000,
            // Prefer websocket — skip the polling→upgrade dance for modern clients
            // Falls back to polling automatically if websocket fails
            transports: ['websocket', 'polling'],
            // Disable per-message deflate — POS payloads are small JSON,
            // compression CPU cost > bandwidth savings
            perMessageDeflate: false,
            // Allow Electron EIO3 clients
            allowEIO3: true,
        });

        // ── Auth middleware ──────────────────────────────────────
        this.io.use(socketAuthMiddleware);

        // ── Start presence monitoring ───────────────────────────
        this.presence.startMonitoring((payload) => {
            this.broadcastTerminalStatusChange(payload);
        });

        // ── Connection handler ──────────────────────────────────
        this.io.on('connection', (socket) => {
            const { user, terminalId, tenantId, branchId } = socket.data;

            console.log(`🔌 Terminal connected: ${user.terminalLabel} (${terminalId}) - User: ${user.username}`);

            // Register in presence manager
            this.presence.register({
                terminalId,
                tenantId,
                branchId,
                userId: user.userId,
                username: user.username,
                terminalLabel: user.terminalLabel,
                socketId: socket.id,
                metadata: {
                    ipAddress: socket.handshake.address,
                },
            });

            // Broadcast to branch: terminal came online
            const statusPayload: TerminalStatusChangePayload = {
                terminalId,
                terminalLabel: user.terminalLabel,
                status: 'online',
                userId: user.userId,
                username: user.username,
                timestamp: new Date().toISOString(),
                branchId,
                tenantId,
            };

            socket.to(`branch:${tenantId}:${branchId}`).emit('terminal:online', statusPayload);

            // ── Heartbeat handler ───────────────────────────────
            socket.on('terminal:heartbeat', (payload, callback) => {
                this.presence.heartbeat(terminalId);

                const ack: HeartbeatAck = {
                    received: true,
                    serverTime: new Date().toISOString(),
                    nextExpectedIn: HEARTBEAT_INTERVAL,
                };

                if (typeof callback === 'function') {
                    callback(ack);
                }
            });

            // ── Status change (idle, etc.) ──────────────────────
            socket.on('terminal:status_change', (payload) => {
                this.presence.updateStatus(terminalId, payload.status);
            });

            // ── List terminals in branch ────────────────────────
            socket.on('terminal:list', (payload, callback) => {
                const targetBranch = payload.branchId || branchId;
                const list = this.presence.getTerminalList(tenantId, targetBranch);

                if (typeof callback === 'function') {
                    callback(list);
                }
            });

            // ── Server status request ───────────────────────────
            socket.on('server:status', (callback) => {
                if (typeof callback === 'function') {
                    callback(this.buildServerStatus());
                }
            });
            // ── Remote server status request ────────────────
            socket.on('server:remote_status', (callback) => {
                if (typeof callback === 'function') {
                    callback(this.remoteHealth.getLastStatus());
                }
            });
            // ── Branch notification relay ───────────────────────
            socket.on('branch:notification', (payload) => {
                const notification: BranchNotification = {
                    ...payload,
                    sourceTerminalId: terminalId,
                    timestamp: new Date().toISOString(),
                };

                // Broadcast to all other terminals in the branch
                socket.to(`branch:${tenantId}:${branchId}`).emit('branch:notification', notification);
            });

            // ── Disconnect ──────────────────────────────────────
            socket.on('disconnect', (reason) => {
                console.log(`🔌 Terminal disconnected: ${user.terminalLabel} (${terminalId}) - Reason: ${reason}`);

                const removed = this.presence.unregister(terminalId);

                if (removed) {
                    const offlinePayload: TerminalStatusChangePayload = {
                        terminalId,
                        terminalLabel: user.terminalLabel,
                        status: 'offline',
                        userId: user.userId,
                        username: user.username,
                        timestamp: new Date().toISOString(),
                        branchId,
                        tenantId,
                    };

                    socket.to(`branch:${tenantId}:${branchId}`).emit('terminal:offline', offlinePayload);
                }
            });
        });

        console.log('✓ WebSocket server initialized');

        // ── Start remote server monitoring (Electron/offline mode only) ──
        // On cloud: the client IS connected to this server — no point pinging ourselves.
        // On Electron: the local server needs to check if the remote sync server is reachable.
        if (config.databaseOfflineMode) {
            this.remoteHealth.start((status) => {
                if (this.io) {
                    this.io.emit('server:remote_status', status);
                }
            });
            console.log('✓ Remote server health monitor started (offline mode)');
        } else {
            console.log('ℹ Remote health monitor skipped (cloud mode — clients connect directly)');
        }

        return this.io;
    }

    /**
     * Gracefully shut down the socket server.
     */
    shutdown(): Promise<void> {
        return new Promise((resolve) => {
            this.presence.stopMonitoring();
            this.remoteHealth.stop();

            if (this.io) {
                // Notify all clients
                this.io.emit('server:maintenance', {
                    message: 'Server is shutting down',
                    estimatedDowntime: 0,
                });

                this.io.close(() => {
                    console.log('✓ WebSocket server closed');
                    this.io = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // ─── Public Emit API ────────────────────────────────────────

    /**
     * Send a notification to all terminals in a branch.
     */
    notifyBranch(tenantId: string, branchId: string, notification: BranchNotification): void {
        if (!this.io) return;
        this.io.to(`branch:${tenantId}:${branchId}`).emit('branch:notification', notification);
    }

    /**
     * Send a notification to all terminals of a tenant.
     */
    notifyTenant(tenantId: string, notification: BranchNotification): void {
        if (!this.io) return;
        this.io.to(`tenant:${tenantId}`).emit('branch:notification', notification);
    }

    /**
     * Send a message to a specific terminal.
     */
    notifyTerminal(terminalId: string, notification: BranchNotification): void {
        if (!this.io) return;
        this.io.to(`terminal:${terminalId}`).emit('branch:notification', notification);
    }

    /**
     * Force disconnect a specific terminal.
     */
    forceDisconnect(terminalId: string, reason: string, reconnectAllowed = true): void {
        if (!this.io) return;

        this.io.to(`terminal:${terminalId}`).emit('terminal:force_disconnect', {
            reason,
            reconnectAllowed,
        });

        // Disconnect via room fetch — O(1) room lookup instead of iterating all sockets
        setTimeout(async () => {
            if (!this.io) return;
            const sockets = await this.io.in(`terminal:${terminalId}`).fetchSockets();
            for (const socket of sockets) {
                socket.disconnect(true);
            }
        }, 500);
    }

    /**
     * Broadcast server status to all connected clients.
     */
    broadcastServerStatus(): void {
        if (!this.io) return;
        this.io.emit('server:status', this.buildServerStatus());
    }

    /**
     * Broadcast server maintenance notice to all clients.
     */
    broadcastMaintenance(message: string, estimatedDowntime?: number): void {
        if (!this.io) return;
        this.io.emit('server:maintenance', { message, estimatedDowntime });
    }

    // ─── Internal ───────────────────────────────────────────────

    /**
     * Broadcast terminal status change to the relevant branch room.
     */
    private broadcastTerminalStatusChange(payload: TerminalStatusChangePayload): void {
        if (!this.io) return;

        const room = `branch:${payload.tenantId}:${payload.branchId}`;

        switch (payload.status) {
            case 'online':
                this.io.to(room).emit('terminal:online', payload);
                break;
            case 'offline':
                this.io.to(room).emit('terminal:offline', payload);
                break;
            case 'idle':
                this.io.to(room).emit('terminal:idle', payload);
                break;
        }

        // Also send updated terminal list to the branch
        const list = this.presence.getTerminalList(payload.tenantId, payload.branchId);
        this.io.to(room).emit('terminal:list_update', list);
    }

    private buildServerStatus(): ServerStatus {
        const config = getConfig();
        return {
            status: 'healthy',
            uptime: process.uptime(),
            connectedTerminals: this.presence.totalConnected,
            version: config.appVersion,
            timestamp: new Date().toISOString(),
            environment: config.nodeEnv,
        };
    }
}
