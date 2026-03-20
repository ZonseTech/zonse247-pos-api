/**
 * @file    Remote server health monitor
 * @desc    Periodically pings the remote cloud/sync server and tracks reachability.
 *          Broadcasts status changes to all connected terminals via WebSocket.
 *
 *          This is critical for Electron terminals that run a local server but
 *          need to know if the remote sync server is reachable.
 *
 * Performance:
 *   - Uses native http/https.request (no axios overhead for a simple ping)
 *   - HEAD request only — no response body transferred
 *   - Only broadcasts to WebSocket clients on reachability STATE CHANGE (not every 30s)
 *   - Cached last status returned instantly for on-demand queries
 */

import http from 'http';
import https from 'https';
import { getConfig } from '../../config/app.config';
import type { RemoteServerStatus } from '../../types/socket';

/** How often to ping the remote server (ms) */
const PING_INTERVAL = 30_000;

/** HTTP timeout for the health check request (ms) */
const PING_TIMEOUT = 8_000;

/** Reusable HTTP agent with keep-alive to avoid TCP handshake on every ping */
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 1 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 1 });

/**
 * @class   RemoteHealthMonitor
 * @desc    Singleton that monitors the remote server's health endpoint.
 *          Emits callbacks only on reachability state changes for efficiency.
 */
export class RemoteHealthMonitor {
    private static instance: RemoteHealthMonitor;
    private timer: ReturnType<typeof setInterval> | null = null;
    private lastStatus: RemoteServerStatus | null = null;
    private previousReachable: boolean | null = null;
    private cachedUrl: string | null = null;
    private checking = false;

    /** Called only when reachability changes (online↔offline) */
    private onStateChange?: (status: RemoteServerStatus) => void;

    private constructor() {
        // Singleton — use getInstance()
    }

    static getInstance(): RemoteHealthMonitor {
        if (!RemoteHealthMonitor.instance) {
            RemoteHealthMonitor.instance = new RemoteHealthMonitor();
        }
        return RemoteHealthMonitor.instance;
    }

    /**
     * Start the periodic health check.
     * @param onStateChange  Called ONLY when reachability flips (not every interval).
     */
    start(onStateChange: (status: RemoteServerStatus) => void): void {
        this.onStateChange = onStateChange;
        if (this.timer) return;

        // Cache the URL once — avoid getConfig() on every tick
        this.cachedUrl = this.resolveRemoteUrl();

        // Run immediately
        this.check();

        this.timer = setInterval(() => {
            this.check();
        }, PING_INTERVAL);

        if (this.timer.unref) {
            this.timer.unref();
        }
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.lastStatus = null;
        this.previousReachable = null;
        this.cachedUrl = null;
        this.checking = false;
    }

    /** Get the last known status without triggering a new check. */
    getLastStatus(): RemoteServerStatus {
        if (this.lastStatus) return this.lastStatus;

        return {
            reachable: false,
            url: this.cachedUrl || this.resolveRemoteUrl(),
            latencyMs: 0,
            statusCode: null,
            lastChecked: new Date().toISOString(),
            error: 'Not checked yet',
        };
    }

    /** Trigger a health check. Debounced — skips if one is already in‐flight. */
    async check(): Promise<RemoteServerStatus> {
        if (this.checking) return this.getLastStatus();
        this.checking = true;

        const url = this.cachedUrl || this.resolveRemoteUrl();
        const healthUrl = `${url}/health`;

        try {
            const status = await this.ping(healthUrl, url);
            this.lastStatus = status;

            // Only broadcast + log on state change
            if (this.previousReachable !== null && this.previousReachable !== status.reachable) {
                const label = status.reachable ? '🟢 reachable' : '🔴 unreachable';
                console.log(`Remote server ${label}: ${url} (${status.latencyMs}ms)`);

                if (this.onStateChange) {
                    this.onStateChange(status);
                }
            } else if (this.previousReachable === null && this.onStateChange) {
                // First check — always broadcast so clients get initial state
                this.onStateChange(status);
            }

            this.previousReachable = status.reachable;
            return status;
        } finally {
            this.checking = false;
        }
    }

    // ─── Internal ───────────────────────────────────────────────

    /** Lightweight HEAD request using native http/https — no axios overhead. */
    private ping(healthUrl: string, baseUrl: string): Promise<RemoteServerStatus> {
        return new Promise((resolve) => {
            const start = Date.now();
            const isHttps = healthUrl.startsWith('https');
            const agent = isHttps ? httpsAgent : httpAgent;
            const lib = isHttps ? https : http;

            const req = lib.request(healthUrl, {
                method: 'HEAD',
                timeout: PING_TIMEOUT,
                agent,
            }, (res) => {
                // Drain the response to free the socket
                res.resume();
                const latencyMs = Date.now() - start;
                const reachable = (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 500;

                resolve({
                    reachable,
                    url: baseUrl,
                    latencyMs,
                    statusCode: res.statusCode ?? null,
                    lastChecked: new Date().toISOString(),
                });
            });

            req.on('error', (err) => {
                resolve({
                    reachable: false,
                    url: baseUrl,
                    latencyMs: Date.now() - start,
                    statusCode: null,
                    lastChecked: new Date().toISOString(),
                    error: err.message,
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    reachable: false,
                    url: baseUrl,
                    latencyMs: Date.now() - start,
                    statusCode: null,
                    lastChecked: new Date().toISOString(),
                    error: 'Request timed out',
                });
            });

            req.end();
        });
    }

    private resolveRemoteUrl(): string {
        const config = getConfig();
        return config.syncServerUrl || config.liveApiUrl;
    }
}
