/**
 * @file    Socket.IO authentication middleware
 * @desc    Verifies JWT tokens on WebSocket handshake and attaches user data to socket.
 *          Reuses the same JWT config as the REST auth middleware for consistency.
 */

import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { getConfig } from '../../config/app.config';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    SocketAuthPayload,
    SocketAuthUser,
} from '../../types/socket';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/**
 * Authenticate socket connections using JWT from the handshake auth payload.
 *
 * The client must provide:
 *   - auth.token       (JWT bearer token)
 *   - auth.terminalId  (the terminal making the connection)
 *   - auth.branchId    (branch scope)
 *   - auth.tenantId    (tenant scope)
 *
 * On success, `socket.data` is populated with the decoded user and terminal info,
 * and the socket joins tenant and branch rooms automatically.
 */
export function socketAuthMiddleware(socket: AppSocket, next: (err?: Error) => void): void {
    try {
        const auth = socket.handshake.auth as SocketAuthPayload;

        // ── Validate required fields ────────────────────────────
        if (!auth?.token) {
            return next(new Error('Authentication error: Token is required'));
        }

        if (!auth.terminalId) {
            return next(new Error('Authentication error: Terminal ID is required'));
        }

        if (!auth.branchId) {
            return next(new Error('Authentication error: Branch ID is required'));
        }

        if (!auth.tenantId) {
            return next(new Error('Authentication error: Tenant ID is required'));
        }

        // ── Verify JWT ──────────────────────────────────────────
        const config = getConfig();
        const decoded = jwt.verify(auth.token, config.jwtSecret) as Record<string, any>;

        // ── Attach user data to socket ──────────────────────────
        const user: SocketAuthUser = {
            userId: decoded.userId,
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            username: decoded.username || decoded.fullname || 'Unknown',
            roleId: decoded.roleId || '',
            terminalId: auth.terminalId,
            terminalLabel: auth.terminalLabel || auth.terminalId,
        };

        socket.data.user = user;
        socket.data.terminalId = auth.terminalId;
        socket.data.tenantId = auth.tenantId;
        socket.data.branchId = auth.branchId;
        socket.data.connectedAt = new Date();

        // ── Auto-join scoped rooms ──────────────────────────────
        socket.join(`tenant:${auth.tenantId}`);
        socket.join(`branch:${auth.tenantId}:${auth.branchId}`);
        socket.join(`terminal:${auth.terminalId}`);

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new Error('Authentication error: Token has expired'));
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new Error('Authentication error: Invalid token'));
        }
        return next(new Error('Authentication error: Connection refused'));
    }
}
