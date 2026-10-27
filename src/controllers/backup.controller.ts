import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { BackupService, BackupError } from '../services/backup.service';
import { AuthRequest, getParam } from '../lib/express.type';
import { SYNC_HEADERS } from '../services/sync/constants/sync.constants';

type BackupRequest = Request & AuthRequest;

export class BackupController extends BaseController {
    private static handleError(res: Response, context: string, error: unknown): void {
        if (error instanceof BackupError) {
            BackupController.sendResponse(res, error.statusCode, false, error.message, undefined, error.name);
            return;
        }
        console.error(`Error in ${context}:`, error);
        BackupController.sendResponse(res, 500, false, 'Backup upload failed', undefined, 'Internal Server Error');
    }

    private static getTenantId(req: BackupRequest): string {
        return req.auth?.tenantId || '';
    }

    /**
     * Start a chunked backup upload
     * POST /backups/uploads
     * Body: { terminalId, totalSize, totalChunks, sha256 }
     */
    static createUpload = async (req: BackupRequest, res: Response): Promise<void> => {
        try {
            const tenantId = BackupController.getTenantId(req);
            if (!tenantId) {
                BackupController.sendResponse(res, 401, false, 'Unauthorized', undefined, 'Unauthorized');
                return;
            }

            const terminalId = req.body?.terminalId || (req.headers[SYNC_HEADERS.TERMINAL_ID] as string);
            const result = await BackupService.createUpload({
                tenantId,
                userId: req.auth?.userId,
                terminalId,
                totalSize: req.body?.totalSize,
                totalChunks: req.body?.totalChunks,
                sha256: req.body?.sha256,
            });

            BackupController.sendResponse(res, 201, true, 'Backup upload started', result);
        } catch (error) {
            BackupController.handleError(res, 'createUpload', error);
        }
    };

    /**
     * Upload one chunk (raw application/octet-stream body)
     * PUT /backups/uploads/:uploadId/chunks/:index
     */
    static uploadChunk = async (req: BackupRequest, res: Response): Promise<void> => {
        try {
            await BackupService.writeChunk(
                BackupController.getTenantId(req),
                getParam(req.params.uploadId),
                Number(getParam(req.params.index)),
                req.body as Buffer
            );
            BackupController.sendResponse(res, 200, true, 'Chunk received');
        } catch (error) {
            BackupController.handleError(res, 'uploadChunk', error);
        }
    };

    /**
     * Assemble chunks, verify checksum and store the backup
     * POST /backups/uploads/:uploadId/complete
     */
    static completeUpload = async (req: BackupRequest, res: Response): Promise<void> => {
        try {
            const result = await BackupService.completeUpload(
                BackupController.getTenantId(req),
                getParam(req.params.uploadId)
            );
            BackupController.sendResponse(res, 201, true, 'Backup stored successfully', result);
        } catch (error) {
            BackupController.handleError(res, 'completeUpload', error);
        }
    };

    /**
     * Latest stored backup for a terminal
     * GET /backups/terminals/:terminalId/latest
     */
    static getLatest = async (req: BackupRequest, res: Response): Promise<void> => {
        try {
            const result = await BackupService.getLatest(
                BackupController.getTenantId(req),
                getParam(req.params.terminalId)
            );
            BackupController.sendResponse(res, 200, true, 'Latest backup fetched successfully', result);
        } catch (error) {
            BackupController.handleError(res, 'getLatest', error);
        }
    };
}
