import { Router } from 'express';
import { SubscriptionPlanController } from '../controllers/subscription-plan.controller';

const router = Router();

router.get('/', SubscriptionPlanController.list);
router.get('/active', SubscriptionPlanController.getActive);
router.get('/:id', SubscriptionPlanController.show);
router.post('/', SubscriptionPlanController.store);
router.put('/:id', SubscriptionPlanController.update);
router.delete('/:id', SubscriptionPlanController.delete);
router.patch('/:id/toggle-status', SubscriptionPlanController.toggleStatus);
router.get('/billing-cycle/:billingCycle', SubscriptionPlanController.getByBillingCycle);
router.get('/:id/validate', SubscriptionPlanController.validatePlan);

export default router;