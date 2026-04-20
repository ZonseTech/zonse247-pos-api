import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { customerSchemas } from '../validations/customer.schemas';

const router = Router();

router.get('/', validateQuery(customerSchemas.listQuery), CustomerController.list);
router.get('/count', CustomerController.count);
router.get('/:customerId', validateParams(customerSchemas.customerIdParam), CustomerController.getById);
router.post('/', validateBody(customerSchemas.createCustomer), CustomerController.create);
router.post('/search', validateBody(customerSchemas.searchCustomer), CustomerController.search);
router.put('/:customerId', validateParams(customerSchemas.customerIdParam), validateBody(customerSchemas.updateCustomer), CustomerController.update);
router.delete('/:customerId', validateParams(customerSchemas.customerIdParam), CustomerController.delete);

export default router;