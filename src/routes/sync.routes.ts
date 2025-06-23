import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';

const router = Router();
const syncController = new SyncController();

router.get('/tables', syncController.getTables);
router.post('/pull', syncController.pullData);
router.post('/push', syncController.pushData);
router.get('/status/:tableName', syncController.getSyncStatus);
router.post('/bulk', syncController.bulkSync);
router.get('/test-connections', syncController.testConnections);

router.get('/stats/:tableName', syncController.getTableStats);
router.get('/records/:tableName', syncController.getAllRecords);

export default router;
