import { Router } from 'express';
import { SupplierPaymentController } from '../controllers/supplier-payment.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import {
    createSupplierPaymentSchema,
    voidSupplierPaymentSchema,
    paymentIdParamSchema,
    invoiceIdParamSchema,
    listSupplierPaymentsQuerySchema,
} from '../validations/supplier-payment.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requireAnyPermission(['payments.process', 'suppliers.orders']), validateBody(createSupplierPaymentSchema), SupplierPaymentController.createPayment);
router.get('/', permissionMiddleware.requireAnyPermission(['payments.view', 'suppliers.orders']), validateQuery(listSupplierPaymentsQuerySchema), SupplierPaymentController.listPayments);
router.get('/invoice/:invoiceId', permissionMiddleware.requireAnyPermission(['payments.view', 'suppliers.orders']), validateParams(invoiceIdParamSchema), SupplierPaymentController.getPaymentsForInvoice);
router.get('/:paymentId', permissionMiddleware.requireAnyPermission(['payments.view', 'suppliers.orders']), validateParams(paymentIdParamSchema), SupplierPaymentController.getPayment);
router.post('/:paymentId/void', permissionMiddleware.requireAnyPermission(['payments.process', 'suppliers.orders']), validateParams(paymentIdParamSchema), validateBody(voidSupplierPaymentSchema), SupplierPaymentController.voidPayment);

export default router;
