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

/**
 * @route   GET /api/v1/onboarding/sync/tables
 * @desc    Get list of tables for initial sync (in dependency order)
 * @access  Public
 */
router.get(
    '/sync/tables',
    asyncHandler(OnboardingDataController.getInitialSyncTables)
);

/**
 * @route   POST /api/v1/onboarding/sync/initial
 * @desc    Sync all master data from cloud during initial onboarding
 * @access  Terminal
 * @body    { tenantId, branchId, terminalId, data: { categories: [], products: [], ... } }
 */
router.post(
    '/sync/initial',
    asyncHandler(OnboardingDataController.syncInitialMasterData)
);

/**
 * @route   POST /api/v1/onboarding/sync/step
 * @desc    Sync data for a specific onboarding step
 * @access  Terminal
 * @body    { tenantId, branchId, terminalId, stepType, data: { ... } }
 */
router.post(
    '/sync/step',
    asyncHandler(OnboardingDataController.syncStepData)
);

/**
 * @route   POST /api/v1/onboarding/master-data/table
 * @desc    Fetch data from a specific table with pagination
 * @access  Terminal
 * @query   table - Table name (required)
 * @query   cursor - Pagination cursor (optional)
 * @query   limit - Records per page (default: 500, max: 1000)
 * @query   since - Delta sync timestamp (optional)
 * @body    { tenantId, branchId }
 */
router.post(
    '/master-data/table',
    asyncHandler(OnboardingDataController.fetchMasterDataTable)
);

/**
 * @route   POST /api/v1/onboarding/master-data/all
 * @desc    Fetch all master data for initial sync
 * @access  Terminal
 * @body    { tenantId, branchId, tables?: [], batchSize?: number, since?: string }
 */
router.post(
    '/master-data/all',
    asyncHandler(OnboardingDataController.fetchAllMasterData)
);

/**
 * @route   POST /api/v1/onboarding/master-data/counts
 * @desc    Get record counts for tables (for progress estimation)
 * @access  Terminal
 * @body    { tenantId, branchId, tables?: [] }
 */
router.post(
    '/master-data/counts',
    asyncHandler(OnboardingDataController.getTableCounts)
);

/**
 * @route   POST /api/v1/onboarding/master-data/products
 * @desc    Fetch products with pagination (includes category and barcodes)
 * @access  Terminal
 * @query   cursor, limit, since
 * @body    { tenantId, branchId }
 */
router.post(
    '/master-data/products',
    asyncHandler(OnboardingDataController.fetchProductsPaginated)
);

/**
 * @route   POST /api/v1/onboarding/master-data/inventory
 * @desc    Fetch inventory with pagination (includes product/variant info)
 * @access  Terminal
 * @query   cursor, limit, since
 * @body    { tenantId, branchId }
 */
router.post(
    '/master-data/inventory',
    asyncHandler(OnboardingDataController.fetchInventoryPaginated)
);

/**
 * @route   POST /api/v1/onboarding/master-data/categories
 * @desc    Fetch categories with pagination
 * @access  Terminal
 * @query   cursor, limit, since
 * @body    { tenantId, branchId }
 */
router.post(
    '/master-data/categories',
    asyncHandler(OnboardingDataController.fetchCategoriesPaginated)
);

/**
 * @route   POST /api/v1/onboarding/master-data/customers
 * @desc    Fetch customers with pagination
 * @access  Terminal
 * @query   cursor, limit, since
 * @body    { tenantId, branchId }
 */
router.post(
    '/master-data/customers',
    asyncHandler(OnboardingDataController.fetchCustomersPaginated)
);

/**
 * @route   POST /api/v1/onboarding/master-data/users
 * @desc    Fetch users with pagination (excludes password hashes)
 * @access  Terminal
 * @query   cursor, limit, since
 * @body    { tenantId, branchId }
 */
router.post(
    '/master-data/users',
    asyncHandler(OnboardingDataController.fetchUsersPaginated)
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