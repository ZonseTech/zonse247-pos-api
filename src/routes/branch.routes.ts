import { Router } from 'express';
import { BranchController } from '../controllers/branch.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { asyncHandler } from '../middlewares/error.middleware';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

/**
 * @route   GET /branches
 * @desc    Retrieve all branches for the authenticated tenant
 * @query   status, branchCode, city, state, district, branchName, isActive, isVirtualWarehouse, isAdminMode
 * @access  Protected — branches.view
 */
router.get('/', permissionMiddleware.requirePermission('branches.view'), asyncHandler(BranchController.list));

/**
 * @route   GET /branches/tenant-branch/primary-terminal-id
 * @desc    Get the primary terminal ID for web client login
 * @query   tenantId - Tenant ID (optional, falls back to auth)
 * @query   branchId - Branch ID (optional, falls back to auth)
 * @access  Protected — used during regular terminal/POS login, not permission-gated
 */
router.get('/tenant-branch/primary-terminal-id', asyncHandler(BranchController.getPrimaryTerminalId));

/**
 * @route   POST /branches
 * @desc    Create a new branch with subscription
 * @body    tenantId: string, branchName: string, subscriptionPlanId: string, subscriptionMonths?: number
 * @access  Protected — branches.create
 */
router.post('/', permissionMiddleware.requirePermission('branches.create'), asyncHandler(BranchController.create));

/**
 * @route   PUT /branches/:branchId
 * @desc    Update an existing branch by ID
 * @param   branchId - Unique branch identifier
 * @body    Branch fields to update (branchId, tenantId, createdAt are protected)
 * @access  Protected — branches.edit or branches.edit.own (own-branch scoping not enforced at this layer yet)
 */
router.put('/:branchId', permissionMiddleware.requireAnyPermission(['branches.edit', 'branches.edit.own']), asyncHandler(BranchController.update));

/**
 * @route   GET /branches/:branchId
 * @desc    Retrieve a single branch by ID
 * @param   branchId - Unique branch identifier
 * @access  Protected — branches.view
 */
router.get('/:branchId', permissionMiddleware.requirePermission('branches.view'), asyncHandler(BranchController.show));

/**
 * @route   DELETE /branches/:branchId
 * @desc    Delete a branch by ID
 * @param   branchId - Unique branch identifier
 * @access  Protected — branches.delete
 */
router.delete('/:branchId', permissionMiddleware.requirePermission('branches.delete'), asyncHandler(BranchController.delete));

export default router;
