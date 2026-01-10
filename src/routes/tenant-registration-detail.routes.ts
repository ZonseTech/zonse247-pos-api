import { Router } from 'express';
import { TenantRegistrationDetailController } from '../controllers/tenant-registration-detail.controller';

const router: Router = Router();

// List all registration details (with optional filters: ?processed=false, ?tenantId=xxx, ?email=xxx)
router.get('/', TenantRegistrationDetailController.list);

// Get a single registration detail by ID
router.get('/:detailId', TenantRegistrationDetailController.show);

// Mark a registration detail as processed
router.put('/:detailId/mark-processed', TenantRegistrationDetailController.markAsProcessed);

// Delete a registration detail
router.delete('/:detailId', TenantRegistrationDetailController.delete);

export default router;
