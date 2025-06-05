import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';

const router = Router();
const syncController = new SyncController();

router.get('/tables', syncController.getTables);
router.post('/pull', syncController.pullData as any);
router.post('/push', syncController.pushData as any);
router.get('/status/:tableName', syncController.getSyncStatus as any);
router.post('/bulk', syncController.bulkSync as any);
router.get('/test-connections', syncController.testConnections);

router.get('/stats/:tableName', syncController.getTableStats as any);
router.get('/records/:tableName', syncController.getAllRecords as any);

export default router;
