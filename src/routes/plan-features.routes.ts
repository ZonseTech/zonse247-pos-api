import { Router } from 'express';
import { PlanFeatureController } from '../controllers/plan-feature.controller';

const router = Router();

router.get('/', PlanFeatureController.list);
router.get('/all', PlanFeatureController.index);
router.get('/:id', PlanFeatureController.show);
router.post('/', PlanFeatureController.store);
router.put('/:id', PlanFeatureController.update);
router.delete('/:id', PlanFeatureController.delete);

export default router;
