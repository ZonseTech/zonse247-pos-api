import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';

const router = Router();

router.post('/', SupplierController.createSupplier);
router.get('/', SupplierController.listSuppliers);
router.get('/:supplierId', SupplierController.getSupplier);
router.put('/:supplierId', SupplierController.updateSupplier);
router.delete('/:supplierId', SupplierController.deleteSupplier);

export default router;
