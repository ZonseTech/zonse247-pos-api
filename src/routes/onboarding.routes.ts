import { Router } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import { validateBody, validateParams } from "../middlewares/validation.middleware";
import { tenantValidationSchemas } from "../validations/tenant.schemas";
import { TenantController } from "../controllers/tenant.controller";
import { DatabaseExportController } from "../controllers/export.controller";
import { branchValidationSchemas } from "../validations/branch.schemas";
import { BranchController } from "../controllers/branch.controller";
import { OnboardingController } from "../controllers/onboarding.controller";
import { SettingsController } from "../controllers/settings.controller";

const router = Router();
const exportController = new DatabaseExportController()

router.get(
    '/export/download/:filename',
    asyncHandler(exportController.downloadFile)
);

router.post(
    '/verify-tenant',
    validateBody(tenantValidationSchemas.verifyTenant),
    asyncHandler(TenantController.verify)
);

router.get(
    '/tenant/:tenantId/branches',
    validateParams(tenantValidationSchemas.tenantId),
    asyncHandler(TenantController.getTenantBranches)
);

router.get(
    '/branch/:branchId/terminals',
    validateParams(branchValidationSchemas.branchId),
    asyncHandler(BranchController.getBranchTerminals)
);

router.use(
    '/status',
    asyncHandler(OnboardingController.getOnboardingStatus)
);

router.post(
    '/settings/configure',
    asyncHandler(SettingsController.createSettings)
);

router.get(
    '/settings',
    asyncHandler(SettingsController.getSettings)
);

export default router;