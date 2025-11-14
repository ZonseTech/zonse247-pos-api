import path from "path";
import { app } from "electron";

class ElectronStorageAdapter implements StorageAdapter {
    getUserDataPath(): string {
        return app.getPath('userData');
    }

    isElectron(): boolean {
        return true;
    }
}

class NodeStorageAdapter implements StorageAdapter {
    private dataPath: string;

    constructor(dataPath?: string) {
        this.dataPath = dataPath || path.join(process.cwd(), '.data');
    }

    getUserDataPath(): string {
        return this.dataPath;
    }

    isElectron(): boolean {
        return false;
    }
}

export { ElectronStorageAdapter, NodeStorageAdapter }