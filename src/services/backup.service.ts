import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import prisma from '../databases/prisma/client';
import { getConfig } from '../config/app.config';

export const BACKUP_CHUNK_MAX_BYTES = 5 * 1024 * 1024;
const BACKUP_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;
const INCOMING_DIR = '.incoming';
const BACKUP_EXTENSION = '.db.gz';
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;

export class BackupError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = 'BackupError';
    }
}

export interface CreateBackupUploadInput {
    tenantId: string;
    userId?: string;
    terminalId: string;
    totalSize: number;
    totalChunks: number;
    sha256: string;
}

export interface BackupFileInfo {
    fileName: string;
    terminalId: string;
    branchId: string;
    size: number;
    createdAt: string;
}

interface UploadMeta {
    uploadId: string;
    tenantId: string;
    branchId: string;
    terminalId: string;
    userId?: string;
    totalSize: number;
    totalChunks: number;
    sha256: string;
    createdAt: string;
}

/**
 * Receives SQLite database snapshots from terminals in chunks and stores them
 * on disk under <root>/<tenantId>/<branchId>/<terminalId>/<timestamp>.db.gz.
 *
 * Chunked because the global request size limit (10mb) and request timeout
 * (30s) make a single-request upload of a full database unreliable on
 * slow field connections.
 */
export class BackupService {
    private static get rootDir(): string {
        return path.resolve(getConfig().backupStoragePath);
    }

    private static incomingDir(uploadId: string): string {
        return path.join(this.rootDir, INCOMING_DIR, uploadId);
    }

    private static terminalDir(tenantId: string, branchId: string, terminalId: string): string {
        return path.join(this.rootDir, tenantId, branchId, terminalId);
    }

    private static assertSafeId(value: string | undefined, label: string): asserts value is string {
        if (!value || !SAFE_ID.test(value)) {
            throw new BackupError(400, `Invalid ${label}`);
        }
    }

    private static async readMeta(tenantId: string, uploadId: string): Promise<UploadMeta> {
        this.assertSafeId(uploadId, 'upload ID');
        let meta: UploadMeta;
        try {
            const raw = await fsp.readFile(path.join(this.incomingDir(uploadId), 'meta.json'), 'utf8');
            meta = JSON.parse(raw);
        } catch {
            throw new BackupError(404, 'Upload not found or expired');
        }
        if (meta.tenantId !== tenantId) {
            throw new BackupError(404, 'Upload not found or expired');
        }
        return meta;
    }

    private static async resolveTerminal(tenantId: string, terminalId: string) {
        const terminal = await prisma.terminal.findFirst({
            where: { terminalId, tenantId },
            select: { terminalId: true, branchId: true },
        });
        if (!terminal) {
            throw new BackupError(404, 'Terminal not found for this tenant');
        }
        return terminal;
    }

    private static async removeStaleUploads(): Promise<void> {
        const base = path.join(this.rootDir, INCOMING_DIR);
        let entries: string[];
        try {
            entries = await fsp.readdir(base);
        } catch {
            return;
        }
        const cutoff = Date.now() - STALE_UPLOAD_MS;
        await Promise.all(
            entries.map(async (entry) => {
                const dir = path.join(base, entry);
                try {
                    const stat = await fsp.stat(dir);
                    if (stat.mtimeMs < cutoff) {
                        await fsp.rm(dir, { recursive: true, force: true });
                    }
                } catch {
                    // Another request may have removed it concurrently
                }
            })
        );
    }

    private static async listBackups(dir: string): Promise<{ fileName: string; size: number; mtime: Date }[]> {
        let entries: string[];
        try {
            entries = await fsp.readdir(dir);
        } catch {
            return [];
        }
        const files = await Promise.all(
            entries
                .filter((name) => name.endsWith(BACKUP_EXTENSION))
                .map(async (fileName) => {
                    const stat = await fsp.stat(path.join(dir, fileName));
                    return { fileName, size: stat.size, mtime: stat.mtime };
                })
        );
        return files.sort((a, b) => b.fileName.localeCompare(a.fileName));
    }

    private static async pruneOldBackups(dir: string): Promise<void> {
        const keep = Math.max(1, getConfig().backupRetentionCount);
        const files = await this.listBackups(dir);
        await Promise.all(
            files.slice(keep).map((file) => fsp.rm(path.join(dir, file.fileName), { force: true }))
        );
    }

    static async createUpload(input: CreateBackupUploadInput): Promise<{ uploadId: string; chunkSize: number }> {
        this.assertSafeId(input.tenantId, 'tenant ID');
        this.assertSafeId(input.terminalId, 'terminal ID');

        const totalSize = Number(input.totalSize);
        const totalChunks = Number(input.totalChunks);
        const sha256 = String(input.sha256 || '').toLowerCase();

        if (!Number.isInteger(totalSize) || totalSize <= 0 || totalSize > BACKUP_MAX_BYTES) {
            throw new BackupError(400, 'Invalid backup size');
        }
        if (!Number.isInteger(totalChunks) || totalChunks !== Math.ceil(totalSize / BACKUP_CHUNK_MAX_BYTES)) {
            throw new BackupError(400, `Backup must be sent in ${BACKUP_CHUNK_MAX_BYTES}-byte chunks`);
        }
        if (!SHA256_HEX.test(sha256)) {
            throw new BackupError(400, 'Invalid SHA-256 checksum');
        }

        const terminal = await this.resolveTerminal(input.tenantId, input.terminalId);
        this.assertSafeId(terminal.branchId, 'branch ID');

        await this.removeStaleUploads();

        const uploadId = crypto.randomUUID();
        const meta: UploadMeta = {
            uploadId,
            tenantId: input.tenantId,
            branchId: terminal.branchId,
            terminalId: terminal.terminalId,
            userId: input.userId,
            totalSize,
            totalChunks,
            sha256,
            createdAt: new Date().toISOString(),
        };

        const dir = this.incomingDir(uploadId);
        await fsp.mkdir(dir, { recursive: true });
        await fsp.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta));

        return { uploadId, chunkSize: BACKUP_CHUNK_MAX_BYTES };
    }

    static async writeChunk(tenantId: string, uploadId: string, index: number, data: Buffer): Promise<void> {
        const meta = await this.readMeta(tenantId, uploadId);

        if (!Number.isInteger(index) || index < 0 || index >= meta.totalChunks) {
            throw new BackupError(400, 'Invalid chunk index');
        }
        if (!Buffer.isBuffer(data) || data.length === 0) {
            throw new BackupError(400, 'Chunk body is empty. Send it as application/octet-stream');
        }

        const isLast = index === meta.totalChunks - 1;
        const expected = isLast
            ? meta.totalSize - BACKUP_CHUNK_MAX_BYTES * (meta.totalChunks - 1)
            : BACKUP_CHUNK_MAX_BYTES;
        if (data.length !== expected) {
            throw new BackupError(400, `Chunk ${index} must be ${expected} bytes, received ${data.length}`);
        }

        const dir = this.incomingDir(uploadId);
        const tmp = path.join(dir, `chunk-${index}.tmp`);
        await fsp.writeFile(tmp, data);
        await fsp.rename(tmp, path.join(dir, `chunk-${index}`));
    }

    static async completeUpload(tenantId: string, uploadId: string): Promise<BackupFileInfo> {
        const meta = await this.readMeta(tenantId, uploadId);
        const incoming = this.incomingDir(uploadId);

        const missing: number[] = [];
        for (let i = 0; i < meta.totalChunks; i++) {
            if (!fs.existsSync(path.join(incoming, `chunk-${i}`))) missing.push(i);
        }
        if (missing.length > 0) {
            throw new BackupError(400, `Missing chunks: ${missing.join(', ')}`);
        }

        const targetDir = this.terminalDir(meta.tenantId, meta.branchId, meta.terminalId);
        await fsp.mkdir(targetDir, { recursive: true });

        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${stamp}${BACKUP_EXTENSION}`;
        const partial = path.join(targetDir, `${fileName}.partial`);
        const finalPath = path.join(targetDir, fileName);

        const hash = crypto.createHash('sha256');
        const out = fs.createWriteStream(partial);
        try {
            for (let i = 0; i < meta.totalChunks; i++) {
                const chunk = await fsp.readFile(path.join(incoming, `chunk-${i}`));
                hash.update(chunk);
                if (!out.write(chunk)) {
                    await new Promise<void>((resolve) => out.once('drain', resolve));
                }
            }
            out.end();
            await new Promise<void>((resolve, reject) => {
                out.once('finish', resolve);
                out.once('error', reject);
            });
        } catch (error) {
            out.destroy();
            await fsp.rm(partial, { force: true });
            throw error;
        }

        if (hash.digest('hex') !== meta.sha256) {
            await fsp.rm(partial, { force: true });
            await fsp.rm(incoming, { recursive: true, force: true });
            throw new BackupError(422, 'Checksum mismatch. The backup was corrupted in transit, please try again');
        }

        await fsp.rename(partial, finalPath);
        await fsp.rm(incoming, { recursive: true, force: true });
        await this.pruneOldBackups(targetDir);

        return {
            fileName,
            terminalId: meta.terminalId,
            branchId: meta.branchId,
            size: meta.totalSize,
            createdAt: new Date().toISOString(),
        };
    }

    static async getLatest(tenantId: string, terminalId: string): Promise<BackupFileInfo | null> {
        this.assertSafeId(tenantId, 'tenant ID');
        this.assertSafeId(terminalId, 'terminal ID');

        const terminal = await this.resolveTerminal(tenantId, terminalId);
        const files = await this.listBackups(this.terminalDir(tenantId, terminal.branchId, terminal.terminalId));
        const latest = files[0];
        if (!latest) return null;

        return {
            fileName: latest.fileName,
            terminalId: terminal.terminalId,
            branchId: terminal.branchId,
            size: latest.size,
            createdAt: latest.mtime.toISOString(),
        };
    }
}
