import { Router } from 'express';
import { SupplierReturnController } from '../controllers/supplier-return.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { supplierReturnSchemas } from '../validations/supplier-return.schemas';

const router = Router();

// ─── Credit Notes (must come before :supplierReturnId to avoid param clash) ──

router.get('/credit-notes', validateQuery(supplierReturnSchemas.creditNoteListQuery), SupplierReturnController.listCreditNotes);
router.post('/credit-notes/:creditNoteId/apply', validateParams(supplierReturnSchemas.creditNoteIdParam), validateBody(supplierReturnSchemas.applyCreditNote), SupplierReturnController.applyCreditNote);

// ─── Supplier Returns ──────────────────────────────────────────────

router.post('/', validateBody(supplierReturnSchemas.createSupplierReturn), SupplierReturnController.createSupplierReturn);
router.get('/', validateQuery(supplierReturnSchemas.listQuery), SupplierReturnController.listSupplierReturns);
router.get('/:supplierReturnId', validateParams(supplierReturnSchemas.idParam), SupplierReturnController.getSupplierReturn);
router.put('/:supplierReturnId', validateParams(supplierReturnSchemas.idParam), validateBody(supplierReturnSchemas.updateSupplierReturn), SupplierReturnController.updateSupplierReturn);
router.post('/:supplierReturnId/approve', validateParams(supplierReturnSchemas.idParam), validateBody(supplierReturnSchemas.statusAction), SupplierReturnController.approveSupplierReturn);
router.post('/:supplierReturnId/ship', validateParams(supplierReturnSchemas.idParam), validateBody(supplierReturnSchemas.statusAction), SupplierReturnController.shipSupplierReturn);
router.post('/:supplierReturnId/complete', validateParams(supplierReturnSchemas.idParam), validateBody(supplierReturnSchemas.statusAction), SupplierReturnController.completeSupplierReturn);
router.post('/:supplierReturnId/cancel', validateParams(supplierReturnSchemas.idParam), validateBody(supplierReturnSchemas.statusAction), SupplierReturnController.cancelSupplierReturn);
router.delete('/:supplierReturnId', validateParams(supplierReturnSchemas.idParam), SupplierReturnController.deleteSupplierReturn);

export default router;
