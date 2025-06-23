import { Router } from 'express';
import { CustomerController } from '../controllers/customer.service';

const router = Router();

router.get('/', (req, res) => {
	res.send('Customer API');
});

router.get('/all', CustomerController.list);
router.get('/customer/:customerId', CustomerController.getById);
router.post('/customer', CustomerController.create);
router.put('/customer', CustomerController.update);
router.delete('/customer/:customerId', CustomerController.delete);
router.get('/customers/count', CustomerController.count);
router.post('/customers/search', CustomerController.search);
router.get('/customers/unsynced', CustomerController.getUnsynced);
router.put('/customer/:customerId/sync', CustomerController.markSynced);

export default router;