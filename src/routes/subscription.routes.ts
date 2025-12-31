import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';

const router = Router();

router.get('/', SubscriptionController.list);
router.get('/stats', SubscriptionController.getStats);
router.get('/expiring', SubscriptionController.getExpiring);
router.get('/status/:status', SubscriptionController.getByStatus);
router.get('/tenant/:tenantId', SubscriptionController.getByTenantId);
router.get('/live/tenant/:tenantId', SubscriptionController.getSubscriptionByTenantId);
router.get('/plan/:planId', SubscriptionController.getByPlanId);
router.get('/:id', SubscriptionController.show);
router.post('/', SubscriptionController.store);
router.put('/:id', SubscriptionController.update);
router.delete('/:id', SubscriptionController.delete);
router.post('/:id/cancel', SubscriptionController.cancel);
router.post('/:id/reactivate', SubscriptionController.reactivate);
router.post('/:id/process-payment', SubscriptionController.processPayment);
router.patch('/bulk-update', SubscriptionController.bulkUpdate);

export default router;