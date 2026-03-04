import { Router } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import { OnboardingController } from "../controllers/onboarding.controller";
import { TerminalSettingsController } from "../controllers/terminal-settings.controller";

const router = Router();

router.post(
    '/terminal/activate',
    asyncHandler(OnboardingController.activateTerminal)
);

router.post(
    '/terminal/save',
    asyncHandler(OnboardingController.saveTerminalDetails)
);

router.post(
    '/progress/init',
    asyncHandler(OnboardingController.initializeProgress)
);

router.get(
    '/progress/:terminalId',
    asyncHandler(OnboardingController.getProgress)
);

router.get(
    '/progress/:terminalId/next-step',
    asyncHandler(OnboardingController.getNextStep)
);

router.put(
    '/progress/step',
    asyncHandler(OnboardingController.updateStepStatus)
);

router.post(
    '/progress/step/start',
    asyncHandler(OnboardingController.startStep)
);

router.post(
    '/progress/step/complete',
    asyncHandler(OnboardingController.completeStep)
);

router.post(
    '/progress/step/fail',
    asyncHandler(OnboardingController.failStep)
);

router.post(
    '/progress/step/skip',
    asyncHandler(OnboardingController.skipStep)
);

router.post(
    '/progress/:terminalId/reset',
    asyncHandler(OnboardingController.resetProgress)
);

router.delete(
    '/progress/:terminalId',
    asyncHandler(OnboardingController.deleteProgress)
);

router.post(
    '/settings/configure',
    asyncHandler(TerminalSettingsController.createSettings)
);

router.get(
    '/settings',
    asyncHandler(TerminalSettingsController.getAllSettings)
);

export default router;