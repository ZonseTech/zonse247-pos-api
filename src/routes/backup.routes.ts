import express, { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { BACKUP_CHUNK_MAX_BYTES } from '../services/backup.service';

const router = Router();

/**
 * @route   POST /v1/backups/uploads
 * @desc    Start a chunked database backup upload
 * @access  Terminal
 */
router.post('/uploads', BackupController.createUpload);

/**
 * @route   PUT /v1/backups/uploads/:uploadId/chunks/:index
 * @desc    Upload one chunk of the gzipped database
 * @access  Terminal
 */
router.put(
    '/uploads/:uploadId/chunks/:index',
    express.raw({ type: 'application/octet-stream', limit: BACKUP_CHUNK_MAX_BYTES }),
    BackupController.uploadChunk
);

/**
 * @route   POST /v1/backups/uploads/:uploadId/complete
 * @desc    Assemble and verify the uploaded backup
 * @access  Terminal
 */
router.post('/uploads/:uploadId/complete', BackupController.completeUpload);

/**
 * @route   GET /v1/backups/terminals/:terminalId/latest
 * @desc    Latest stored backup for a terminal
 * @access  Terminal
 */
router.get('/terminals/:terminalId/latest', BackupController.getLatest);

export default router;
