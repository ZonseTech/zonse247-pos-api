import { Router } from 'express';
import { BranchController } from '../controllers/branch.controller';

const router = Router();

/**
 * @route   GET /branches
 * @desc    Retrieve all branches for the authenticated tenant
 * @query   status, branchCode, city, state, district, branchName, isActive, isVirtualWarehouse, isAdminMode
 * @access  Protected
 */
router.get('/', BranchController.list);

/**
 * @route   POST /branches
 * @desc    Create a new branch with subscription
 * @body    tenantId: string, branchName: string, subscriptionPlanId: string, subscriptionMonths?: number
 * @access  Protected
 */
router.post('/', BranchController.create);

/**
 * @route   PUT /branches/:branchId
 * @desc    Update an existing branch by ID
 * @param   branchId - Unique branch identifier
 * @body    Branch fields to update (branchId, tenantId, createdAt are protected)
 * @access  Protected
 */
router.put('/:branchId', BranchController.update);

/**
 * @route   GET /branches/:branchId
 * @desc    Retrieve a single branch by ID
 * @param   branchId - Unique branch identifier
 * @access  Protected
 */
router.get('/:branchId', BranchController.show);

/**
 * @route   DELETE /branches/:branchId
 * @desc    Delete a branch by ID
 * @param   branchId - Unique branch identifier
 * @access  Protected
 */
router.delete('/:branchId', BranchController.delete);

export default router;