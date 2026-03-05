import { Router } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import { OnboardingController } from "../controllers/onboarding/onboarding.controller";
import { OnboardingDataController } from "../controllers/onboarding/onboarding-data.controller";
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
    '/terminal/set-activated',
    asyncHandler(OnboardingController.setTerminalActivated)
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
    '/fetch/subscription-plans',
    asyncHandler(OnboardingDataController.fetchSubscriptionPlans)
);

router.post(
    '/fetch/payment-methods',
    asyncHandler(OnboardingDataController.fetchPaymentMethods)
);

router.post(
    '/fetch/payment-providers',
    asyncHandler(OnboardingDataController.fetchPaymentServiceProviders)
);

router.post(
    '/fetch/categories',
    asyncHandler(OnboardingDataController.fetchCategories)
);

router.post(
    '/fetch/customers',
    asyncHandler(OnboardingDataController.fetchCustomers)
);

router.post(
    '/sync/subscription-plans',
    asyncHandler(OnboardingDataController.syncSubscriptionPlans)
);

router.post(
    '/sync/payment-methods',
    asyncHandler(OnboardingDataController.syncPaymentMethods)
);

router.post(
    '/sync/payment-providers',
    asyncHandler(OnboardingDataController.syncPaymentServiceProviders)
);

router.post(
    '/sync/categories',
    asyncHandler(OnboardingDataController.syncCategories)
);

router.post(
    '/sync/customers',
    asyncHandler(OnboardingDataController.syncCustomers)
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