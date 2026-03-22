import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';
import { validateQuery } from '../middlewares/validation.middleware';
import { inventoryValidationSchemas } from '../validations/inventory.schemas';

const router = Router();

router.post('/', SupplierController.createSupplier);
router.get('/', validateQuery(inventoryValidationSchemas.listSuppliersQuery), SupplierController.listSuppliers);
router.get('/:supplierId', SupplierController.getSupplier);
router.put('/:supplierId', SupplierController.updateSupplier);
router.delete('/:supplierId', SupplierController.deleteSupplier);

export default router;
