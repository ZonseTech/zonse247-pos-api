import { Router } from 'express';
import { SupplierInvoiceController } from '../controllers/supplier-invoice.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { supplierInvoiceSchemas } from '../validations/supplier-invoice.schemas';

const router = Router();

router.post('/', validateBody(supplierInvoiceSchemas.createSupplierInvoice), SupplierInvoiceController.createInvoice);
router.get('/', validateQuery(supplierInvoiceSchemas.listQuery), SupplierInvoiceController.listInvoices);
router.get('/match/:purchaseOrderId', validateParams(supplierInvoiceSchemas.poIdParam), SupplierInvoiceController.threeWayMatch);
router.get('/balance/:supplierId', validateParams(supplierInvoiceSchemas.supplierIdParam), SupplierInvoiceController.getSupplierBalance);
router.get('/:invoiceId', validateParams(supplierInvoiceSchemas.idParam), SupplierInvoiceController.getInvoice);
router.put('/:invoiceId', validateParams(supplierInvoiceSchemas.idParam), validateBody(supplierInvoiceSchemas.updateSupplierInvoice), SupplierInvoiceController.updateInvoice);
router.post('/:invoiceId/cancel', validateParams(supplierInvoiceSchemas.idParam), SupplierInvoiceController.cancelInvoice);
router.post('/:invoiceId/dispute', validateParams(supplierInvoiceSchemas.idParam), validateBody(supplierInvoiceSchemas.disputeInvoice), SupplierInvoiceController.disputeInvoice);
router.delete('/:invoiceId', validateParams(supplierInvoiceSchemas.idParam), SupplierInvoiceController.deleteInvoice);

export default router;
