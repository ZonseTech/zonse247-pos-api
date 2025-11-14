import path from "path";

class ElectronStorageAdapter implements StorageAdapter {
    private app: any;

    constructor() {
        this.app = require('electron').app;
    }

    getUserDataPath(): string {
        return this.app.getPath('userData');
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