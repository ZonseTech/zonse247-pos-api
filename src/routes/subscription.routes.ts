import { Router } from "express";
import { SubscriptionController } from "../controllers/subscription.controller";

const router: Router = Router();

router.get('/stats', SubscriptionController.getStats);
router.get('/expiring/:days', SubscriptionController.getExpiring);
router.patch('/bulk-update', SubscriptionController.bulkUpdate);
router.get('/status/:status', SubscriptionController.getByStatus);
router.get('/client/:clientUuid', SubscriptionController.getByClientUuid);
router.get('/plan/:planId', SubscriptionController.getByPlanId);
router.get('/subscription-plans', SubscriptionController.getSubscriptionPlans);
router.post('/create-subscription', SubscriptionController.createSubscription);
router.get('/', SubscriptionController.list);
router.post('/', SubscriptionController.store);
router.get('/:id', SubscriptionController.show);
router.put('/:id', SubscriptionController.update);
router.delete('/:id', SubscriptionController.delete);
router.put('/:id/cancel', SubscriptionController.cancel);
router.put('/:id/reactivate', SubscriptionController.reactivate);
router.post('/:id/payment', SubscriptionController.processPayment);

export default router;