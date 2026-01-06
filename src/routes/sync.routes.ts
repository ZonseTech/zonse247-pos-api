import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';

const router = Router();
const syncController = new SyncController();

router.get('/tables', syncController.getTables);
router.get('/status/:tableName', syncController.getSyncStatus);
router.get('/stats/:tableName', syncController.getTableStats);
router.get('/records/:tableName', syncController.getAllRecords);
router.post('/pull', syncController.pullData);
router.post('/push', syncController.pushData);
router.post('/bidirectional', syncController.bidirectionalSync);
router.post('/bulk', syncController.bulkSync);
router.put('/configure/:tableName', syncController.configureTable);
router.post('/auto-sync/start', syncController.startAutoSync);
router.post('/auto-sync/stop', syncController.stopAutoSync);
router.get('/auto-sync/status', syncController.getAutoSyncStatus);

export default router;
