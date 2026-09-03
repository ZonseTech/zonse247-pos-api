import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';

const router: Router = Router();
const permissionMiddleware = new PermissionMiddleware();

/**
 * @route   GET /tenants
 * @desc    Retrieve a paginated list of all tenants
 * @query   page: number, limit: number
 * @access  Protected — tenants.view
 */
router.get('/', permissionMiddleware.requirePermission('tenants.view'), TenantController.list);

/** 
 * @route   POST /tenants
 * @desc    Create a new tenant
 * @body    name: string, email: string, ...tenant details
 * @access  Protected
 */
router.post('/', TenantController.store);

/**
 * @route   GET /tenants/:tenantId
 * @desc    Retrieve a single tenant by ID
 * @param   tenantId - Unique tenant identifier
 * @access  Protected — tenants.view
 */
router.get('/:tenantId', permissionMiddleware.requirePermission('tenants.view'), TenantController.show);

/**
 * @route   PUT /tenants/:tenantId
 * @desc    Update an existing tenant by ID
 * @param   tenantId - Unique tenant identifier
 * @body    Tenant fields to update
 * @access  Protected
 */
router.put('/:tenantId', TenantController.update);

/**
 * @route   DELETE /tenants/:tenantId
 * @desc    Soft delete a tenant by ID
 * @param   tenantId - Unique tenant identifier
 * @access  Protected
 */
router.delete('/:tenantId', TenantController.delete);

export default router;
