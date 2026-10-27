/**
 * Chunked terminal database backup upload (BackupService)
 *
 * Covers create → chunk → complete on a temp storage dir, checksum
 * verification, tenant isolation, path-safety and retention pruning.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { BackupService, BackupError, BACKUP_CHUNK_MAX_BYTES } from '../services/backup.service';
import BackupRoutes from '../routes/backup.routes';
import { updateConfig } from '../config/app.config';
import { prisma } from '../databases/prisma/client';

jest.mock('../databases/prisma/client', () => {
    const mockPrisma = { terminal: { findFirst: jest.fn() } };
    return { __esModule: true, default: mockPrisma, prisma: mockPrisma };
});

const findTerminal = (prisma as any).terminal.findFirst as jest.Mock;

const TENANT = 'tenant_1';
const BRANCH = 'branch_1';
const TERMINAL = 'terminal_1';

let root: string;

function sha256(buf: Buffer): string {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function split(buf: Buffer): Buffer[] {
    const parts: Buffer[] = [];
    for (let i = 0; i < buf.length; i += BACKUP_CHUNK_MAX_BYTES) {
        parts.push(buf.subarray(i, i + BACKUP_CHUNK_MAX_BYTES));
    }
    return parts;
}

async function uploadAll(data: Buffer, checksum = sha256(data)) {
    const chunks = split(data);
    const { uploadId } = await BackupService.createUpload({
        tenantId: TENANT,
        terminalId: TERMINAL,
        totalSize: data.length,
        totalChunks: chunks.length,
        sha256: checksum,
    });
    for (let i = 0; i < chunks.length; i++) {
        await BackupService.writeChunk(TENANT, uploadId, i, Buffer.from(chunks[i]));
    }
    return { uploadId, result: () => BackupService.completeUpload(TENANT, uploadId) };
}

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
    updateConfig({ backupStoragePath: root, backupRetentionCount: 2 });
    findTerminal.mockReset();
    findTerminal.mockImplementation(({ where }: any) =>
        Promise.resolve(
            where.tenantId === TENANT && where.terminalId === TERMINAL
                ? { terminalId: TERMINAL, branchId: BRANCH }
                : null
        )
    );
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

describe('BackupService chunked upload', () => {
    it('stores a multi-chunk upload byte-for-byte under tenant/branch/terminal', async () => {
        const data = crypto.randomBytes(BACKUP_CHUNK_MAX_BYTES * 2 + 1234);
        const { result } = await uploadAll(data);
        const info = await result();

        const stored = path.join(root, TENANT, BRANCH, TERMINAL, info.fileName);
        expect(info.size).toBe(data.length);
        expect(fs.readFileSync(stored).equals(data)).toBe(true);
        expect(fs.existsSync(path.join(root, '.incoming'))).toBe(true);
        expect(fs.readdirSync(path.join(root, '.incoming'))).toHaveLength(0);

        const latest = await BackupService.getLatest(TENANT, TERMINAL);
        expect(latest?.fileName).toBe(info.fileName);
    });

    it('rejects completion when the checksum does not match', async () => {
        const data = crypto.randomBytes(1000);
        const { result } = await uploadAll(data, 'a'.repeat(64));
        await expect(result()).rejects.toMatchObject({ statusCode: 422 });
        expect(await BackupService.getLatest(TENANT, TERMINAL)).toBeNull();
    });

    it('rejects completion with missing chunks', async () => {
        const data = crypto.randomBytes(BACKUP_CHUNK_MAX_BYTES + 10);
        const { uploadId } = await BackupService.createUpload({
            tenantId: TENANT,
            terminalId: TERMINAL,
            totalSize: data.length,
            totalChunks: 2,
            sha256: sha256(data),
        });
        await BackupService.writeChunk(TENANT, uploadId, 0, data.subarray(0, BACKUP_CHUNK_MAX_BYTES));
        await expect(BackupService.completeUpload(TENANT, uploadId)).rejects.toThrow('Missing chunks: 1');
    });

    it('rejects a chunk of the wrong size', async () => {
        const data = crypto.randomBytes(500);
        const { uploadId } = await BackupService.createUpload({
            tenantId: TENANT,
            terminalId: TERMINAL,
            totalSize: data.length,
            totalChunks: 1,
            sha256: sha256(data),
        });
        await expect(BackupService.writeChunk(TENANT, uploadId, 0, data.subarray(0, 100))).rejects.toBeInstanceOf(BackupError);
    });

    it('does not let another tenant touch an upload', async () => {
        const data = crypto.randomBytes(100);
        const { uploadId } = await BackupService.createUpload({
            tenantId: TENANT,
            terminalId: TERMINAL,
            totalSize: data.length,
            totalChunks: 1,
            sha256: sha256(data),
        });
        await expect(BackupService.writeChunk('tenant_2', uploadId, 0, data)).rejects.toMatchObject({ statusCode: 404 });
        await expect(BackupService.completeUpload('tenant_2', uploadId)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects terminals that do not belong to the tenant', async () => {
        await expect(
            BackupService.createUpload({ tenantId: TENANT, terminalId: 'other', totalSize: 1, totalChunks: 1, sha256: 'a'.repeat(64) })
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects path traversal in ids', async () => {
        await expect(BackupService.writeChunk(TENANT, '../../etc', 0, Buffer.from('x'))).rejects.toMatchObject({ statusCode: 400 });
        await expect(
            BackupService.createUpload({ tenantId: TENANT, terminalId: '../x', totalSize: 1, totalChunks: 1, sha256: 'a'.repeat(64) })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('keeps only the configured number of backups per terminal', async () => {
        for (let i = 0; i < 3; i++) {
            const { result } = await uploadAll(crypto.randomBytes(50));
            await result();
            await new Promise((r) => setTimeout(r, 5));
        }
        const files = fs.readdirSync(path.join(root, TENANT, BRANCH, TERMINAL));
        expect(files).toHaveLength(2);
    });
});

describe('backup routes over HTTP', () => {
    let server: ReturnType<express.Express['listen']>;
    let base: string;

    beforeEach(async () => {
        const app = express();
        app.use(express.json());
        app.use((req: any, _res, next) => {
            req.auth = { tenantId: TENANT, userId: 'user_1' };
            next();
        });
        app.use('/v1/backups', BackupRoutes);
        server = app.listen(0);
        await new Promise((r) => server.once('listening', r));
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/backups`;
    });

    afterEach(async () => {
        await new Promise((r) => server.close(r));
    });

    it('accepts a binary chunked upload end to end', async () => {
        const data = crypto.randomBytes(BACKUP_CHUNK_MAX_BYTES + 777);
        const chunks = split(data);

        const created = await fetch(`${base}/uploads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terminalId: TERMINAL, totalSize: data.length, totalChunks: chunks.length, sha256: sha256(data) }),
        });
        expect(created.status).toBe(201);
        const { data: upload } = (await created.json()) as any;

        for (let i = 0; i < chunks.length; i++) {
            const res = await fetch(`${base}/uploads/${upload.uploadId}/chunks/${i}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: chunks[i],
            });
            expect(res.status).toBe(200);
        }

        const completed = await fetch(`${base}/uploads/${upload.uploadId}/complete`, { method: 'POST' });
        expect(completed.status).toBe(201);
        const { data: info } = (await completed.json()) as any;
        expect(fs.readFileSync(path.join(root, TENANT, BRANCH, TERMINAL, info.fileName)).equals(data)).toBe(true);

        const latest = await fetch(`${base}/terminals/${TERMINAL}/latest`);
        expect(((await latest.json()) as any).data.fileName).toBe(info.fileName);
    });

    it('rejects a chunk sent as JSON instead of octet-stream', async () => {
        const data = crypto.randomBytes(10);
        const created = await fetch(`${base}/uploads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terminalId: TERMINAL, totalSize: 10, totalChunks: 1, sha256: sha256(data) }),
        });
        const { data: upload } = (await created.json()) as any;
        const res = await fetch(`${base}/uploads/${upload.uploadId}/chunks/0`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: 1 }),
        });
        expect(res.status).toBe(400);
    });
});
