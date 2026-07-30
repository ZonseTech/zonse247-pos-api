import { Router } from 'express';
import { PaymentServiceProviderController } from '../controllers/payment-service-provider.controller';

const router = Router();

router.get('/', PaymentServiceProviderController.getWelcome);
router.get('/all', PaymentServiceProviderController.getAllPaymentServiceProviders);
router.get('/search', PaymentServiceProviderController.searchPaymentServiceProviders);
router.get('/by-method/:methodId', PaymentServiceProviderController.getByMethod);
router.get('/psp/:pspId', PaymentServiceProviderController.getPaymentServiceProviderById);
router.post('/psp', PaymentServiceProviderController.createPaymentServiceProvider);
router.put('/psp/:pspId', PaymentServiceProviderController.updatePaymentServiceProvider);
router.put('/psp/:pspId/sync', PaymentServiceProviderController.markPaymentServiceProviderAsSynced);
router.delete('/psp/:pspId', PaymentServiceProviderController.deletePaymentServiceProvider);

export default router;