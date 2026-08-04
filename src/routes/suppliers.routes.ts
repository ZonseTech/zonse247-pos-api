import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateQuery } from '../middlewares/validation.middleware';
import { inventoryValidationSchemas } from '../validations/inventory.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requirePermission('suppliers.create'), SupplierController.createSupplier);
router.get('/', permissionMiddleware.requirePermission('suppliers.view'), validateQuery(inventoryValidationSchemas.listSuppliersQuery), SupplierController.listSuppliers);
router.get('/:supplierId', permissionMiddleware.requirePermission('suppliers.view'), SupplierController.getSupplier);
router.get('/:supplierId/products', permissionMiddleware.requireAnyPermission(['suppliers.view', 'suppliers.orders']), SupplierController.getSupplierProducts);
router.put('/:supplierId', permissionMiddleware.requirePermission('suppliers.edit'), SupplierController.updateSupplier);
router.delete('/:supplierId', permissionMiddleware.requirePermission('suppliers.delete'), SupplierController.deleteSupplier);

export default router;
