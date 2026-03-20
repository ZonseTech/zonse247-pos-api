/**
 * @file    Socket module barrel export
 * @desc    Re-exports all socket-related services and types for clean imports.
 *
 * Usage:
 *   import { SocketService, TerminalPresenceManager } from './services/socket';
 */

export { SocketService } from './socket.service';
export { TerminalPresenceManager } from './terminal-presence.manager';
export { socketAuthMiddleware } from './socket-auth.middleware';
