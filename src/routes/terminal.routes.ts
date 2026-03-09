import { Router } from 'express';
import { TerminalController } from '../controllers/terminal.controller';

const router: Router = Router();

/**
 * @route   GET /terminals
 * @desc    Retrieve all terminals for the authenticated tenant/branch
 * @query   branchId: string (optional), isAdminMode: boolean (optional)
 * @access  Protected
 */
router.get('/', TerminalController.getAllTerminals);

/**
 * @route   POST /terminals
 * @desc    Create a new terminal with auto-generated activation code
 * @body    tenantId: string, branchId: string, terminalCode: string, terminalLabel: string
 * @access  Protected
 */
router.post('/', TerminalController.createTerminal);

/**
 * @route   GET /terminals/:terminalId
 * @desc    Retrieve a single terminal by ID
 * @param   terminalId - Unique terminal identifier
 * @access  Protected
 */
router.get('/:terminalId', TerminalController.getTerminal);

/**
 * @route   PUT /terminals/:terminalId
 * @desc    Update an existing terminal by ID
 * @param   terminalId - Unique terminal identifier
 * @body    Terminal fields to update
 * @access  Protected
 */
router.put('/:terminalId', TerminalController.updateTerminal);

/**
 * @route   DELETE /terminals/:terminalId
 * @desc    Delete a terminal by ID
 * @param   terminalId - Unique terminal identifier
 * @access  Protected
 */
router.delete('/:terminalId', TerminalController.deleteTerminal);

export default router;
