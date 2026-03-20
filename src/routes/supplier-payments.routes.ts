import { Router } from 'express';
import { SupplierPaymentController } from '../controllers/supplier-payment.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import {
    createSupplierPaymentSchema,
    voidSupplierPaymentSchema,
    paymentIdParamSchema,
    invoiceIdParamSchema,
    listSupplierPaymentsQuerySchema,
} from '../validations/supplier-payment.schemas';

const router = Router();

router.post('/', validateBody(createSupplierPaymentSchema), SupplierPaymentController.createPayment);
router.get('/', validateQuery(listSupplierPaymentsQuerySchema), SupplierPaymentController.listPayments);
router.get('/invoice/:invoiceId', validateParams(invoiceIdParamSchema), SupplierPaymentController.getPaymentsForInvoice);
router.get('/:paymentId', validateParams(paymentIdParamSchema), SupplierPaymentController.getPayment);
router.post('/:paymentId/void', validateParams(paymentIdParamSchema), validateBody(voidSupplierPaymentSchema), SupplierPaymentController.voidPayment);

export default router;
