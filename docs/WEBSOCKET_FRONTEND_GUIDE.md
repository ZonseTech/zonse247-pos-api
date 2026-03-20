# WebSocket Integration Guide (React & Electron)

This guide covers how to integrate the Zonse247 POS real-time WebSocket system into your **React** frontend and **Electron** desktop application.

## Overview

The API uses **Socket.IO** running on the same port as the HTTP server. No additional ports or configuration needed. Terminals connect via WebSocket to:

- See which other terminals are **online/offline/idle** in real-time
- Receive **server status** updates
- Get **branch-level notifications** (new sale, stock changes, announcements)
- Send and receive **heartbeats** to maintain presence

---

## 1. Install the Client Library

```bash
npm install socket.io-client
```

---

## 2. TypeScript Types

All types are exported from the API package. If using the API as an npm dependency (Electron):

```typescript
import type {
  ConnectedTerminal,
  TerminalOnlineStatus,
  TerminalListResponse,
  ServerStatus,  RemoteServerStatus,  BranchNotification,
  HeartbeatPayload,
  HeartbeatAck,
  TerminalStatusChangePayload,
  ClientToServerEvents,
  ServerToClientEvents,
  ForceDisconnectPayload,
} from "zonse247-pos-api";
```

If using the API as a remote server (React web), copy the types or reference them:

```typescript
type TerminalOnlineStatus = "online" | "offline" | "idle";

interface ConnectedTerminal {
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
}

interface ServerStatus {
  status: "healthy" | "degraded" | "maintenance";
  uptime: number;
  connectedTerminals: number;
  version: string;
  timestamp: string;
  environment: string;
}

interface RemoteServerStatus {
  reachable: boolean;
  url: string;
  latencyMs: number;
  statusCode: number | null;
  lastChecked: string;
  error?: string;
}

interface BranchNotification {
  type:
    | "sale"
    | "stock_update"
    | "price_change"
    | "sync"
    | "announcement"
    | "alert";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: "low" | "normal" | "high" | "critical";
  timestamp: string;
  sourceTerminalId?: string;
}

interface TerminalListResponse {
  terminals: ConnectedTerminal[];
  totalOnline: number;
  totalOffline: number;
}

interface TerminalStatusChangePayload {
  terminalId: string;
  terminalLabel: string;
  status: TerminalOnlineStatus;
  userId: string;
  username: string;
  timestamp: string;
  branchId: string;
  tenantId: string;
}

interface RemoteServerStatus {
  reachable: boolean;
  url: string;
  latencyMs: number;
  statusCode: number | null;
  lastChecked: string;
  error?: string;
}
```

---

## 3. React Hook — `useSocket`

```typescript
// hooks/useSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketOptions {
  token: string;
  terminalId: string;
  branchId: string;
  tenantId: string;
  terminalLabel: string;
  serverUrl?: string;
  metadata?: {
    deviceId?: string;
    osName?: string;
    osVersion?: string;
    appVersion?: string;
  };
}

interface ConnectedTerminal {
  terminalId: string;
  tenantId: string;
  branchId: string;
  userId: string;
  username: string;
  terminalLabel: string;
  status: "online" | "offline" | "idle";
  connectedAt: Date;
  lastHeartbeat: Date;
  socketId: string;
}

interface ServerStatus {
  status: "healthy" | "degraded" | "maintenance";
  uptime: number;
  connectedTerminals: number;
  version: string;
  timestamp: string;
  environment: string;
}

interface RemoteServerStatus {
  reachable: boolean;
  url: string;
  latencyMs: number;
  statusCode: number | null;
  lastChecked: string;
  error?: string;
}

interface BranchNotification {
  type:
    | "sale"
    | "stock_update"
    | "price_change"
    | "sync"
    | "announcement"
    | "alert";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: "low" | "normal" | "high" | "critical";
  timestamp: string;
  sourceTerminalId?: string;
}

export function useSocket(options: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineTerminals, setOnlineTerminals] = useState<ConnectedTerminal[]>(
    [],
  );
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [remoteServerStatus, setRemoteServerStatus] = useState<RemoteServerStatus | null>(null);
  const [notifications, setNotifications] = useState<BranchNotification[]>([]);

  // ─── Heartbeat ──────────────────────────────────────
  const startHeartbeat = useCallback(
    (socket: Socket) => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      heartbeatRef.current = setInterval(() => {
        socket.emit(
          "terminal:heartbeat",
          {
            terminalId: options.terminalId,
            timestamp: new Date().toISOString(),
          },
          (_ack: unknown) => {
            // Server acknowledged — ack.serverTime available for clock sync
          },
        );
      }, 30_000);
    },
    [options.terminalId],
  );

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ─── Refresh terminal list ──────────────────────────
  const refreshTerminalList = useCallback((sock?: Socket) => {
    const s = sock || socketRef.current;
    s?.emit(
      "terminal:list",
      {},
      (response: { terminals: ConnectedTerminal[] }) => {
        setOnlineTerminals(response.terminals);
      },
    );
  }, []);

  // ─── Connect ────────────────────────────────────────
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const baseURL = options.serverUrl || "http://localhost:3000";

    const socket = io(baseURL, {
      auth: {
        token: options.token,
        terminalId: options.terminalId,
        branchId: options.branchId,
        tenantId: options.tenantId,
        terminalLabel: options.terminalLabel,
        metadata: options.metadata,
      },
      transports: ["polling", "websocket"],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    // ── Connection lifecycle ──────────────────────────
    socket.on("connect", () => {
      setIsConnected(true);
      startHeartbeat(socket);
      refreshTerminalList(socket);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      stopHeartbeat();
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error.message);
    });

    // ── Terminal presence events ──────────────────────
    socket.on("terminal:online", () => refreshTerminalList(socket));
    socket.on("terminal:offline", () => refreshTerminalList(socket));
    socket.on("terminal:idle", () => refreshTerminalList(socket));

    socket.on(
      "terminal:list_update",
      (payload: { terminals: ConnectedTerminal[] }) => {
        setOnlineTerminals(payload.terminals);
      },
    );

    // ── Server events ────────────────────────────────
    socket.on("server:status", (status: ServerStatus) => {
      setServerStatus(status);
    });

    socket.on("server:remote_status", (status: RemoteServerStatus) => {
      setRemoteServerStatus(status);
    });

    socket.on("server:maintenance", (info: { message: string }) => {
      console.warn("⚠️ Server maintenance:", info.message);
    });

    // ── Branch notifications ─────────────────────────
    socket.on("branch:notification", (notification: BranchNotification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
    });

    // ── Force disconnect ─────────────────────────────
    socket.on(
      "terminal:force_disconnect",
      (payload: { reason: string; reconnectAllowed: boolean }) => {
        console.warn("Forced disconnect:", payload.reason);
        if (!payload.reconnectAllowed) {
          socket.disconnect();
        }
      },
    );

    socketRef.current = socket;
  }, [options, startHeartbeat, stopHeartbeat, refreshTerminalList]);

  // ─── Disconnect ─────────────────────────────────────
  const disconnect = useCallback(() => {
    stopHeartbeat();
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  }, [stopHeartbeat]);

  // ─── Public action methods ──────────────────────────
  const getServerStatus = useCallback((): Promise<ServerStatus> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error("Socket not connected"));
      socketRef.current.emit("server:status", (status: ServerStatus) => {
        setServerStatus(status);
        resolve(status);
      });
    });
  }, []);

  const getRemoteServerStatus = useCallback((): Promise<RemoteServerStatus> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error("Socket not connected"));
      socketRef.current.emit("server:remote_status", (status: RemoteServerStatus) => {
        setRemoteServerStatus(status);
        resolve(status);
      });
    });
  }, []);

  const sendBranchNotification = useCallback(
    (notification: Omit<BranchNotification, "timestamp">) => {
      socketRef.current?.emit("branch:notification", {
        ...notification,
        timestamp: new Date().toISOString(),
      } as BranchNotification);
    },
    [],
  );

  const setTerminalIdle = useCallback(() => {
    socketRef.current?.emit("terminal:status_change", {
      status: "idle" as const,
    });
  }, []);

  const setTerminalActive = useCallback(() => {
    socketRef.current?.emit("terminal:status_change", {
      status: "online" as const,
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // ─── Auto-connect / cleanup ─────────────────────────
  useEffect(() => {
    if (options.token && options.terminalId) {
      connect();
    }
    return () => disconnect();
  }, [connect, disconnect, options.token, options.terminalId]);

  return {
    socket: socketRef.current,
    isConnected,
    onlineTerminals,
    serverStatus,
    remoteServerStatus,
    notifications,
    connect,
    disconnect,
    refreshTerminalList,
    getServerStatus,
    getRemoteServerStatus,
    sendBranchNotification,
    setTerminalIdle,
    setTerminalActive,
    clearNotifications,
  };
}
```

---

## 4. React Context Provider (Optional)

Wrap your app in a socket context so any component can access real-time state:

```tsx
// context/SocketContext.tsx
import React, { createContext, useContext, useMemo } from "react";
import { useSocket } from "../hooks/useSocket";

type SocketContextType = ReturnType<typeof useSocket>;

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
  token: string;
  terminalId: string;
  branchId: string;
  tenantId: string;
  terminalLabel: string;
  serverUrl?: string;
}

export function SocketProvider({
  children,
  token,
  terminalId,
  branchId,
  tenantId,
  terminalLabel,
  serverUrl,
}: SocketProviderProps) {
  const socketOptions = useMemo(
    () => ({ token, terminalId, branchId, tenantId, terminalLabel, serverUrl }),
    [token, terminalId, branchId, tenantId, terminalLabel, serverUrl],
  );

  const socket = useSocket(socketOptions);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
}
```

Usage in your app:

```tsx
// App.tsx
import { SocketProvider } from "./context/SocketContext";

function App() {
  const { token, tenantId, branchId } = useAuth();
  const { terminalId, terminalLabel } = useTerminal();

  return (
    <SocketProvider
      token={token}
      terminalId={terminalId}
      branchId={branchId}
      tenantId={tenantId}
      terminalLabel={terminalLabel}
      serverUrl={import.meta.env.VITE_API_URL}
    >
      <RouterOutlet />
    </SocketProvider>
  );
}
```

---

## 5. Component Examples

### Terminal Status Indicator

```tsx
// components/TerminalStatusList.tsx
import { useSocketContext } from "../context/SocketContext";

export function TerminalStatusList() {
  const { onlineTerminals, isConnected } = useSocketContext();

  if (!isConnected) {
    return <div className="text-red-500">● Disconnected from server</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">
        Terminals ({onlineTerminals.length} online)
      </h3>
      {onlineTerminals.map((terminal) => (
        <div key={terminal.terminalId} className="flex items-center gap-2">
          <span
            className={
              terminal.status === "online"
                ? "text-green-500"
                : terminal.status === "idle"
                  ? "text-yellow-500"
                  : "text-red-500"
            }
          >
            ●
          </span>
          <span>{terminal.terminalLabel}</span>
          <span className="text-xs text-gray-400">({terminal.username})</span>
          <span className="text-xs text-gray-500 capitalize">
            {terminal.status}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### Server Status Badge

```tsx
// components/ServerStatusBadge.tsx
import { useEffect } from "react";
import { useSocketContext } from "../context/SocketContext";

export function ServerStatusBadge() {
  const { serverStatus, getServerStatus, isConnected } = useSocketContext();

  useEffect(() => {
    if (isConnected) {
      getServerStatus();
      const interval = setInterval(getServerStatus, 60_000);
      return () => clearInterval(interval);
    }
  }, [isConnected, getServerStatus]);

  if (!serverStatus) return null;

  const color =
    serverStatus.status === "healthy"
      ? "bg-green-500"
      : serverStatus.status === "degraded"
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span>Server: {serverStatus.status}</span>
      <span className="text-gray-400">
        v{serverStatus.version} • {serverStatus.connectedTerminals} terminals
      </span>
    </div>
  );
}
```

### Remote Server Status Badge

```tsx
// components/RemoteServerBadge.tsx
import { useEffect } from "react";
import { useSocketContext } from "../context/SocketContext";

export function RemoteServerBadge() {
  const { remoteServerStatus, getRemoteServerStatus, isConnected } = useSocketContext();

  useEffect(() => {
    if (isConnected) {
      getRemoteServerStatus();
    }
  }, [isConnected, getRemoteServerStatus]);

  if (!remoteServerStatus) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-2 h-2 rounded-full ${
          remoteServerStatus.reachable ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span>
        Cloud: {remoteServerStatus.reachable ? "Connected" : "Disconnected"}
      </span>
      {remoteServerStatus.reachable && (
        <span className="text-gray-400">
          {remoteServerStatus.latencyMs}ms
        </span>
      )}
      {!remoteServerStatus.reachable && remoteServerStatus.error && (
        <span className="text-red-400 text-xs">
          {remoteServerStatus.error}
        </span>
      )}
    </div>
  );
}
```

### Notification Toast Handler

```tsx
// components/NotificationHandler.tsx
import { useEffect } from "react";
import { useSocketContext } from "../context/SocketContext";
import { toast } from "your-toast-library"; // e.g. react-hot-toast, sonner

export function NotificationHandler() {
  const { notifications } = useSocketContext();

  useEffect(() => {
    const latest = notifications[0];
    if (!latest) return;

    switch (latest.priority) {
      case "critical":
        toast.error(`${latest.title}: ${latest.message}`);
        break;
      case "high":
        toast.warning(latest.message);
        break;
      default:
        toast.info(latest.message);
    }
  }, [notifications]);

  return null; // Render nothing — just listens
}
```

---

## 6. Electron Integration

When the API runs **embedded in Electron** as an npm package, the socket server starts automatically with `server.start()`.

### Main Process Setup

```typescript
// electron/main.ts
import { app, BrowserWindow, ipcMain } from "electron";
import Server from "zonse247-pos-api";

let server: InstanceType<typeof Server>;

app.whenReady().then(async () => {
  // Start the API server (socket.io included)
  server = new Server(app, {
    serverPort: "3000",
    databaseProvider: "sqlite",
  });
  await server.start();

  // The socket service is now available from main process
  const socketService = server.getSocketService();
  const presence = socketService.getPresence();

  // Expose to renderer via IPC
  ipcMain.handle(
    "get-online-terminals",
    (_event, tenantId: string, branchId: string) => {
      return presence.getTerminalList(tenantId, branchId);
    },
  );

  ipcMain.handle(
    "notify-branch",
    (_event, tenantId: string, branchId: string, notification) => {
      socketService.notifyBranch(tenantId, branchId, notification);
    },
  );

  ipcMain.handle(
    "force-disconnect-terminal",
    (_event, terminalId: string, reason: string) => {
      socketService.forceDisconnect(terminalId, reason);
    },
  );

  // Create the renderer window
  const win = new BrowserWindow({
    /* ... */
  });
  win.loadURL("http://localhost:5173");
});

app.on("before-quit", async () => {
  await server.stop();
});
```

### Renderer Process (React in Electron)

The renderer connects using the same `useSocket` hook — just point it to `localhost`:

```tsx
// In your Electron React app
import { SocketProvider } from "./context/SocketContext";

function ElectronApp() {
  const { token, tenantId, branchId } = useAuth();
  const { terminalId, terminalLabel } = useTerminal();

  return (
    <SocketProvider
      token={token}
      terminalId={terminalId}
      branchId={branchId}
      tenantId={tenantId}
      terminalLabel={terminalLabel}
      serverUrl="http://localhost:3000"
    >
      <App />
    </SocketProvider>
  );
}
```

### Using Both IPC and WebSocket

In Electron, you have two paths to the socket layer:

| Path                                      | When to use                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **WebSocket** (renderer → server)         | Real-time events, presence, heartbeats — same as any React app                                     |
| **IPC** (renderer → main → SocketService) | Admin actions: force-disconnect, broadcast maintenance, query presence without a socket connection |

```tsx
// Renderer: admin panel force-disconnects a terminal via IPC
const { ipcRenderer } = window.require("electron");

async function kickTerminal(terminalId: string) {
  await ipcRenderer.invoke(
    "force-disconnect-terminal",
    terminalId,
    "Admin action",
  );
}
```

---

## 7. Events Reference

### Client → Server (you emit these)

| Event                    | Payload                                     | Callback             | Description                               |
| ------------------------ | ------------------------------------------- | -------------------- | ----------------------------------------- |
| `terminal:heartbeat`     | `{ terminalId, timestamp, currentScreen? }` | `(ack) => void`      | Keep-alive ping every 30s                 |
| `terminal:status_change` | `{ status: 'online' \| 'idle' }`            | —                    | Manually set terminal status              |
| `terminal:list`          | `{ branchId? }`                             | `(response) => void` | Get list of online terminals              |
| `server:status`          | —                                           | `(status) => void`   | Request current server status             |
| `server:remote_status`   | —                                           | `(status) => void`   | Request remote cloud server status        |
| `branch:notification`    | `BranchNotification`                        | —                    | Send notification to all branch terminals |

### Server → Client (you listen to these)

| Event                       | Payload                           | Description                            |
| --------------------------- | --------------------------------- | -------------------------------------- |
| `terminal:online`           | `TerminalStatusChangePayload`     | A terminal in your branch came online  |
| `terminal:offline`          | `TerminalStatusChangePayload`     | A terminal in your branch went offline |
| `terminal:idle`             | `TerminalStatusChangePayload`     | A terminal in your branch went idle    |
| `terminal:list_update`      | `TerminalListResponse`            | Updated terminal list for branch       |
| `server:status`             | `ServerStatus`                    | Server health/status broadcast              |
| `server:remote_status`      | `RemoteServerStatus`              | Remote cloud server reachability changed    |
| `server:maintenance`        | `{ message, estimatedDowntime? }` | Server going into maintenance               |
| `branch:notification`       | `BranchNotification`              | Notification from another terminal     |
| `terminal:force_disconnect` | `{ reason, reconnectAllowed }`    | Server is forcing you to disconnect    |

---

## 8. Connection Lifecycle

```
Client (React)                   Server
  │                                │
  │── connect (auth payload) ─────►│  JWT verified, rooms joined
  │◄── terminal:online ──────────│  Broadcast to branch
  │                                │
  │── terminal:heartbeat ────────►│  Every 30s
  │◄── heartbeat ack ───────────│
  │                                │
  │  ... 60s no heartbeat ...      │  Status → idle
  │◄── terminal:idle ───────────│  Broadcast to branch
  │                                │
  │  ... 120s no heartbeat ...     │  Status → offline
  │◄── terminal:offline ────────│  Broadcast to branch
  │                                │
  │── disconnect ────────────────►│
  │◄── terminal:offline ────────│  Broadcast to branch
  │                                │
```

---

## 9. Idle Detection Hook

```typescript
// hooks/useIdleDetection.ts
import { useEffect, useRef, useCallback } from "react";
import { useSocketContext } from "../context/SocketContext";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function useIdleDetection() {
  const { setTerminalIdle, setTerminalActive, isConnected } =
    useSocketContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (!isConnected) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (isIdleRef.current) {
      isIdleRef.current = false;
      setTerminalActive();
    }

    timerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      setTerminalIdle();
    }, IDLE_TIMEOUT);
  }, [isConnected, setTerminalIdle, setTerminalActive]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      events.forEach((event) =>
        document.removeEventListener(event, resetTimer),
      );
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);
}
```

Usage:

```tsx
// Place inside any component within SocketProvider
function App() {
  useIdleDetection();
  return <RouterOutlet />;
}
```

---

## 10. Error Handling

```tsx
// In your connect logic or a dedicated error handler
socket.on("connect_error", async (error) => {
  if (error.message.includes("Token has expired")) {
    // Refresh your JWT and reconnect
    const newToken = await refreshAuthToken();
    socket.auth = { ...socket.auth, token: newToken };
    socket.connect();
  } else if (error.message.includes("Terminal ID is required")) {
    // Terminal not configured — redirect to setup
    navigate("/terminal-setup");
  } else {
    console.error("Socket connection error:", error.message);
  }
});
```

---

## 11. Best Practices

1. **Always send heartbeats** — Without them, your terminal is marked idle (60s) then offline (120s)
2. **Handle reconnection** — Socket.IO auto-reconnects, but restart heartbeats and fetch the terminal list on reconnect
3. **Set idle on blur** — Use the `useIdleDetection` hook or listen for window blur/focus events
4. **Refresh token flow** — If the JWT expires, disconnect, refresh, and reconnect with the new token
5. **Listen for `force_disconnect`** — The server may force-disconnect blocked/deactivated terminals
6. **Use context/provider** — Wrap your app in `SocketProvider` so any component can access real-time state without prop drilling
7. **Electron dual-path** — Use WebSocket for real-time events in the renderer, IPC + `SocketService` for admin operations from the main process
