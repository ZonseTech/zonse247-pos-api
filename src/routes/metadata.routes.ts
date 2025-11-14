import { Request, Response, Router } from 'express';
import { MetadataController } from '../controllers/metadata.controller';

const router = Router();

router.get('/', function (req: Request, res: Response): void {
    res.send('Metadata Sync API');
});

router.post('/roles', MetadataController.syncRoles);
router.post('/permissions', MetadataController.syncPermissions);
router.post('/role-permissions', MetadataController.syncRolePermissions);
router.post('/default-user', MetadataController.syncDefaultUser);
router.post('/customer', MetadataController.syncCustomer);
router.post('/category', MetadataController.syncCategory);
router.post('/subscription-plans', MetadataController.syncSubscriptionPlans);
router.post('/tenant-subscription', MetadataController.syncTenantSubscription);
router.post('/payment-methods', MetadataController.syncPaymentMethods);
router.post('/payment-service-provider', MetadataController.syncPaymentServiceProvider);

router.post('/sync-all', MetadataController.syncAll);
router.get('/status', MetadataController.getStatus);

export default router;