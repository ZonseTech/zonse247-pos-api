import { Router } from 'express';
import { SupplierInvoiceController } from '../controllers/supplier-invoice.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { supplierInvoiceSchemas } from '../validations/supplier-invoice.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requirePermission('suppliers.orders'), validateBody(supplierInvoiceSchemas.createSupplierInvoice), SupplierInvoiceController.createInvoice);
router.get('/', permissionMiddleware.requirePermission('suppliers.orders'), validateQuery(supplierInvoiceSchemas.listQuery), SupplierInvoiceController.listInvoices);
router.get('/match/:purchaseOrderId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierInvoiceSchemas.poIdParam), SupplierInvoiceController.threeWayMatch);
router.get('/balance/:supplierId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierInvoiceSchemas.supplierIdParam), SupplierInvoiceController.getSupplierBalance);
router.get('/:invoiceId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierInvoiceSchemas.idParam), SupplierInvoiceController.getInvoice);
router.put('/:invoiceId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierInvoiceSchemas.idParam), validateBody(supplierInvoiceSchemas.updateSupplierInvoice), SupplierInvoiceController.updateInvoice);
router.post('/:invoiceId/cancel', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierInvoiceSchemas.idParam), SupplierInvoiceController.cancelInvoice);
router.post('/:invoiceId/dispute', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierInvoiceSchemas.idParam), validateBody(supplierInvoiceSchemas.disputeInvoice), SupplierInvoiceController.disputeInvoice);
router.delete('/:invoiceId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(supplierInvoiceSchemas.idParam), SupplierInvoiceController.deleteInvoice);

export default router;
