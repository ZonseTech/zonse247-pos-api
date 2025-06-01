import { Router } from 'express';
import { DatabaseExportController } from '../controllers/DatabaseExport.controller';

const router = Router();
const exportController = new DatabaseExportController();

router.get('/tables', exportController.getTables);
router.get('/stats/:tableName', exportController.getTableStats);
router.post('/preview', exportController.previewData);
router.post('/data', exportController.exportData);
router.post('/download', exportController.createDownload);
router.get('/download/:filename', exportController.downloadFile);
router.post('/bulk', exportController.bulkExport);
router.delete('/cleanup', exportController.cleanupFiles);

export default router;
