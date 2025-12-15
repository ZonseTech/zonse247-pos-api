import { Router } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import { validateBody, validateParams } from "../middlewares/validation.middleware";
import { tenantValidationSchemas } from "../validations/tenant.schemas";
import { TenantController } from "../controllers/tenant.controller";
import { branchValidationSchemas } from "../validations/branch.schemas";
import { BranchController } from "../controllers/branch.controller";
import { OnboardingController } from "../controllers/onboarding.controller";
import { SettingsController } from "../controllers/settings.controller";

const router = Router();

router.post(
    '/verify-tenant',
    validateBody(tenantValidationSchemas.verifyTenant),
    asyncHandler(TenantController.verify)
);

router.post(
    '/live/verify-account',
    validateBody(tenantValidationSchemas.verifyTenant),
    asyncHandler(TenantController.verifyTenantAccount)
);

router.get(
    '/tenant/:tenantId/branches',
    validateParams(tenantValidationSchemas.tenantId),
    asyncHandler(TenantController.getTenantBranches)
);

router.get(
    '/live/tenant/:tenantId/branches',
    validateParams(tenantValidationSchemas.tenantId),
    asyncHandler(TenantController.getTenantAccountBranches)
);

router.get(
    '/branch/:branchId/terminals',
    validateParams(branchValidationSchemas.branchId),
    asyncHandler(BranchController.getBranchTerminals)
);

router.get(
    '/live/branch/:branchId/terminals',
    validateParams(branchValidationSchemas.branchId),
    asyncHandler(BranchController.getTenantBranchAccountTerminals)
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