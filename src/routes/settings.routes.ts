import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';

const router = Router();

router.get('/:key', SettingsController.getSetting)
router.put('/:uuid', SettingsController.updateSetting)
router.delete('/:uuid', SettingsController.deleteSetting)

export default router;