import { Request, Response, Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';

const router: Router = Router();

router.get('/', function (req: Request, res: Response): void {
    res.send('Tenant endpoints');
});

router.get('/all', TenantController.list);
router.post('/post', TenantController.store);
router.get('/:tenantId', TenantController.show);

router.post('/register-tenant', TenantController.store);
router.put('/update/:id', TenantController.update);
router.delete('/tenant/:id', TenantController.delete);
router.put('/update-tenant/:tenantId', TenantController.update);
router.get('/onboarding-status/:tenantId', TenantController.getOnboardingStatus);

export default router;