import { Router } from 'express';
import { TerminalController } from '../controllers/terminal.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { asyncHandler } from '../middlewares/error.middleware';

const router: Router = Router();
const permissionMiddleware = new PermissionMiddleware();

/**
 * @route   GET /terminals
 * @desc    Retrieve all terminals for the authenticated tenant/branch
 * @query   branchId: string (optional), isAdminMode: boolean (optional)
 * @access  Protected — terminals.view
 */
router.get('/', permissionMiddleware.requirePermission('terminals.view'), asyncHandler(TerminalController.getAllTerminals));

/**
 * @route   POST /terminals
 * @desc    Create a new terminal with auto-generated activation code
 * @body    tenantId: string, branchId: string, terminalCode: string, terminalLabel: string
 * @access  Protected — terminals.create
 */
router.post('/', permissionMiddleware.requirePermission('terminals.create'), asyncHandler(TerminalController.createTerminal));

/**
 * @route   GET /terminals/:terminalId
 * @desc    Retrieve a single terminal by ID
 * @param   terminalId - Unique terminal identifier
 * @access  Protected — terminals.view
 */
router.get('/:terminalId', permissionMiddleware.requirePermission('terminals.view'), asyncHandler(TerminalController.getTerminal));

/**
 * @route   PUT /terminals/:terminalId
 * @desc    Update an existing terminal by ID
 * @param   terminalId - Unique terminal identifier
 * @body    Terminal fields to update
 * @access  Protected — terminals.edit
 */
router.put('/:terminalId', permissionMiddleware.requirePermission('terminals.edit'), asyncHandler(TerminalController.updateTerminal));

/**
 * @route   DELETE /terminals/:terminalId
 * @desc    Delete a terminal by ID
 * @param   terminalId - Unique terminal identifier
 * @access  Protected — terminals.delete
 */
router.delete('/:terminalId', permissionMiddleware.requirePermission('terminals.delete'), asyncHandler(TerminalController.deleteTerminal));

/**
 * @route   POST /terminals/:terminalId/regenerate-activation-code
 * @desc    Regenerate activation code for a terminal and reset activation status to PENDING
 * @param   terminalId - Unique terminal identifier
 * @access  Protected — terminals.edit
 */
router.post('/:terminalId/regenerate-activation-code', permissionMiddleware.requirePermission('terminals.edit'), asyncHandler(TerminalController.regenerateActivationCode));

export default router;
