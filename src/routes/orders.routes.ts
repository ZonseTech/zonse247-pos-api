import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';

const router = Router();

router.get('/', (req, res) => {
	res.send('Orders API');
});

router.get('/all', OrderController.list);
router.get('/ref/:refNumber', OrderController.getByRefNumber);
router.get('/product/:productId', OrderController.getByProductId);
router.get('/:orderId', OrderController.getById);
router.post('/items', OrderController.createItems);
router.post('/items/batch', OrderController.createItemsBatch);
router.put('/:orderId', OrderController.update);
router.delete('/:orderId', OrderController.delete);
router.delete('/ref/:refNumber', OrderController.deleteByRefNumber);
router.get('/status/unsynced', OrderController.getUnsynced);
router.patch('/:orderId/sync', OrderController.markAsSynced);
router.get('/stats/count', OrderController.getCount);
router.get('/stats/summary/:refNumber', OrderController.getSummary);
router.post('/search', OrderController.search);

export default router;
