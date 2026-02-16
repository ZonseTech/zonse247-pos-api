import { Router } from 'express';
import { TerminalSettingsController } from '../controllers/terminal-settings.controller';

const router = Router();

// List all settings
router.get('/', TerminalSettingsController.getAllSettings);

// Get default settings (without persisting)
router.get('/defaults', TerminalSettingsController.getDefaultSettings);

// Check if configured
router.get('/configured', TerminalSettingsController.isConfigured);

// Get or create settings
router.post('/get-or-create', TerminalSettingsController.getOrCreateSettings);

// Get settings by terminal ID
// Returns: { general, receipt, business, security }
router.get('/:terminalId', TerminalSettingsController.getSettings);

// Create settings
router.post('/', TerminalSettingsController.createSettings);

// Update settings (accepts { general, receipt, business, security })
router.put('/:terminalId', TerminalSettingsController.updateSettings);

// Update a specific group (general, receipt, business, security)
router.patch('/:terminalId/group/:groupName', TerminalSettingsController.updateSettingsGroup);

// Deactivate (soft delete)
router.patch('/:terminalId/deactivate', TerminalSettingsController.deactivateSettings);

// Reset to defaults
router.post('/:terminalId/reset', TerminalSettingsController.resetSettings);

// Delete (hard delete)
router.delete('/:terminalId', TerminalSettingsController.deleteSettings);

export default router;
