import { Router } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import { TerminalSettingsController } from "../controllers/terminal-settings.controller";

const router = Router();

router.post(
    '/settings/configure',
    asyncHandler(TerminalSettingsController.createSettings)
);

router.get(
    '/settings',
    asyncHandler(TerminalSettingsController.getAllSettings)
);

export default router;