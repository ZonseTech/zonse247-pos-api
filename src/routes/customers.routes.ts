import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';

const router = Router();

router.get('/', CustomerController.list);
router.get('/:customerId', CustomerController.getById);
router.post('/', CustomerController.create);
router.put('/:customerId', CustomerController.update);
router.delete('/:customerId', CustomerController.delete);
router.get('/count', CustomerController.count);
router.post('/search', CustomerController.search);

export default router;