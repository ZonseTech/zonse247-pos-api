import { Router } from 'express';
import { SupplierReturnController } from '../controllers/supplier-return.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { supplierReturnSchemas } from '../validations/supplier-return.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

// ─── Credit Notes (must come before :supplierReturnId to avoid param clash) ──

router.get('/credit-notes', permissionMiddleware.requirePermission('suppliers.orders'), validateQuery(supplierReturnSchemas.creditNoteListQuery), SupplierReturnController.listCreditNotes);
router.post('/credit-notes/:creditNoteId/apply', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierReturnSchemas.creditNoteIdParam), validateBody(supplierReturnSchemas.applyCreditNote), SupplierReturnController.applyCreditNote);

// ─── Supplier Returns ──────────────────────────────────────────────

router.post('/', permissionMiddleware.requirePermission('suppliers.orders'), validateBody(supplierReturnSchemas.createSupplierReturn), SupplierReturnController.createSupplierReturn);
router.get('/', permissionMiddleware.requirePermission('suppliers.orders'), validateQuery(supplierReturnSchemas.listQuery), SupplierReturnController.listSupplierReturns);
router.get('/:supplierReturnId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierReturnSchemas.idParam), SupplierReturnController.getSupplierReturn);
router.put('/:supplierReturnId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierReturnSchemas.idParam), validateBody(supplierReturnSchemas.updateSupplierReturn), SupplierReturnController.updateSupplierReturn);
router.post('/:supplierReturnId/approve', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierReturnSchemas.idParam), validateBody(supplierReturnSchemas.statusAction), SupplierReturnController.approveSupplierReturn);
router.post('/:supplierReturnId/ship', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierReturnSchemas.idParam), validateBody(supplierReturnSchemas.statusAction), SupplierReturnController.shipSupplierReturn);
router.post('/:supplierReturnId/complete', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierReturnSchemas.idParam), validateBody(supplierReturnSchemas.statusAction), SupplierReturnController.completeSupplierReturn);
router.post('/:supplierReturnId/cancel', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierReturnSchemas.idParam), validateBody(supplierReturnSchemas.statusAction), SupplierReturnController.cancelSupplierReturn);
router.delete('/:supplierReturnId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierReturnSchemas.idParam), SupplierReturnController.deleteSupplierReturn);

export default router;
