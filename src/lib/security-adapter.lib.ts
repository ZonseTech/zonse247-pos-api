import path from "path";

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

export { NodeStorageAdapter }