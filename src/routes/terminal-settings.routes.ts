import { Router } from 'express';
import { TerminalSettingsController } from '../controllers/terminal-settings.controller';

const router = Router();

router.get('/', TerminalSettingsController.getAllSettings);
router.get('/configured', TerminalSettingsController.isConfigured);
router.post('/get-or-create', TerminalSettingsController.getOrCreateSettings);
router.get('/:terminalId', TerminalSettingsController.getSettings);
router.post('/', TerminalSettingsController.createSettings);
router.put('/:terminalId', TerminalSettingsController.updateSettings);
router.patch('/:terminalId/group/:groupName', TerminalSettingsController.updateSettingsGroup);
router.patch('/:terminalId/deactivate', TerminalSettingsController.deactivateSettings);
router.delete('/:terminalId', TerminalSettingsController.deleteSettings);

export default router;
