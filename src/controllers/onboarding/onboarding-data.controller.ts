import { Request, Response } from "express";
import { BaseController } from "../base.controller";
import { OnboardingFetchService } from "../../services/onboarding/onboarding-fetch.service";
import { OnboardingSyncService } from "../../services/onboarding/onboarding-sync.service";
import { InitialSyncService, INITIAL_SYNC_TABLES, InitialSyncTable } from "../../services/onboarding/initial-sync.service";
import { MasterDataFetchService } from "../../services/onboarding/master-data-fetch.service";
import type { OnboardingStepType } from 'on-boarding';

/**
 * @class   OnboardingDataController
 * @desc    Handles onboarding data fetch and sync HTTP requests
 * @extends BaseController
 */
export class OnboardingDataController {
    /**
     * @method  fetchSubscriptionPlans
     * @desc    Fetch subscription plans from local database
     */
    static async fetchSubscriptionPlans(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const plans = await OnboardingFetchService.fetchSubscriptionPlans({
                tenantId,
                branchId
            });

            BaseController.sendResponse(res, 200, true, `Fetched ${plans.length} subscription plans`, plans);
        } catch (error: any) {
            console.error('Error fetching subscription plans:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  fetchPaymentMethods
     * @desc    Fetch payment methods from local database
     */
    static async fetchPaymentMethods(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const paymentMethods = await OnboardingFetchService.fetchPaymentMethods({
                tenantId,
                branchId
            });

            BaseController.sendResponse(res, 200, true, `Fetched ${paymentMethods.length} payment methods`, paymentMethods);
        } catch (error: any) {
            console.error('Error fetching payment methods:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  fetchPaymentServiceProviders
     * @desc    Fetch payment service providers from local database
     */
    static async fetchPaymentServiceProviders(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const providers = await OnboardingFetchService.fetchPaymentServiceProviders({
                tenantId,
                branchId
            });

            BaseController.sendResponse(res, 200, true, `Fetched ${providers.length} payment service providers`, providers);
        } catch (error: any) {
            console.error('Error fetching payment service providers:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  fetchCategories
     * @desc    Fetch categories from local database
     */
    static async fetchCategories(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const categories = await OnboardingFetchService.fetchCategories({
                tenantId,
                branchId
            });

            BaseController.sendResponse(res, 200, true, `Fetched ${categories.length} categories`, categories);
        } catch (error: any) {
            console.error('Error fetching categories:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  fetchCustomers
     * @desc    Fetch customers from local database
     */
    static async fetchCustomers(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const customers = await OnboardingFetchService.fetchCustomers({
                tenantId,
                branchId
            });

            BaseController.sendResponse(res, 200, true, `Fetched ${customers.length} customers`, customers);
        } catch (error: any) {
            console.error('Error fetching customers:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  syncSubscriptionPlans
     * @desc    Sync subscription plans to local database
     */
    static async syncSubscriptionPlans(req: Request, res: Response): Promise<void> {
        try {
            const { plans } = req.body;

            if (!plans || !Array.isArray(plans)) {
                BaseController.sendResponse(res, 400, false, 'plans array is required');
                return;
            }

            const syncResult = await OnboardingSyncService.syncSubscriptionPlans(plans);

            const message = `Subscription plans sync completed. Saved: ${syncResult.summary.saved}, Skipped: ${syncResult.summary.skipped}, Failed: ${syncResult.summary.failed}`;
            BaseController.sendResponse(res, 200, true, message, syncResult);
        } catch (error: any) {
            console.error('Error syncing subscription plans:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  syncPaymentMethods
     * @desc    Sync payment methods to local database
     */
    static async syncPaymentMethods(req: Request, res: Response): Promise<void> {
        try {
            const { paymentMethods, tenantId, branchId } = req.body;

            if (!paymentMethods || !Array.isArray(paymentMethods)) {
                BaseController.sendResponse(res, 400, false, 'paymentMethods array is required');
                return;
            }

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const syncResult = await OnboardingSyncService.syncPaymentMethods(paymentMethods, tenantId, branchId);

            const message = `Payment methods sync completed. Saved: ${syncResult.summary.saved}, Skipped: ${syncResult.summary.skipped}, Failed: ${syncResult.summary.failed}`;
            BaseController.sendResponse(res, 200, true, message, syncResult);
        } catch (error: any) {
            console.error('Error syncing payment methods:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  syncPaymentServiceProviders
     * @desc    Sync payment service providers to local database
     */
    static async syncPaymentServiceProviders(req: Request, res: Response): Promise<void> {
        try {
            const { providers } = req.body;

            if (!providers || !Array.isArray(providers)) {
                BaseController.sendResponse(res, 400, false, 'providers array is required');
                return;
            }

            const syncResult = await OnboardingSyncService.syncPaymentServiceProviders(providers);

            const message = `Payment service providers sync completed. Saved: ${syncResult.summary.saved}, Skipped: ${syncResult.summary.skipped}, Failed: ${syncResult.summary.failed}`;
            BaseController.sendResponse(res, 200, true, message, syncResult);
        } catch (error: any) {
            console.error('Error syncing payment service providers:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  syncCategories
     * @desc    Sync categories to local database
     */
    static async syncCategories(req: Request, res: Response): Promise<void> {
        try {
            const { categories } = req.body;

            if (!categories || !Array.isArray(categories)) {
                BaseController.sendResponse(res, 400, false, 'categories array is required');
                return;
            }

            const syncResult = await OnboardingSyncService.syncCategories(categories);

            const message = `Categories sync completed. Saved: ${syncResult.summary.saved}, Skipped: ${syncResult.summary.skipped}, Failed: ${syncResult.summary.failed}`;
            BaseController.sendResponse(res, 200, true, message, syncResult);
        } catch (error: any) {
            console.error('Error syncing categories:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  syncCustomers
     * @desc    Sync customers to local database
     */
    static async syncCustomers(req: Request, res: Response): Promise<void> {
        try {
            const { customers } = req.body;

            if (!customers || !Array.isArray(customers)) {
                BaseController.sendResponse(res, 400, false, 'customers array is required');
                return;
            }

            const syncResult = await OnboardingSyncService.syncCustomers(customers);

            const message = `Customers sync completed. Saved: ${syncResult.summary.saved}, Skipped: ${syncResult.summary.skipped}, Failed: ${syncResult.summary.failed}`;
            BaseController.sendResponse(res, 200, true, message, syncResult);
        } catch (error: any) {
            console.error('Error syncing customers:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    // ==========================================
    // INITIAL MASTER DATA SYNC METHODS
    // ==========================================

    /**
     * @method  syncInitialMasterData
     * @desc    Sync all master data from cloud to local database during onboarding
     *          This is the main endpoint for initial data load after terminal activation
     * @body    { tenantId, branchId, terminalId, data: { categories: [], products: [], ... } }
     */
    static async syncInitialMasterData(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, terminalId, data } = req.body;

            if (!tenantId || !branchId || !terminalId) {
                BaseController.sendResponse(res, 400, false, 'tenantId, branchId, and terminalId are required');
                return;
            }

            if (!data || typeof data !== 'object') {
                BaseController.sendResponse(res, 400, false, 'data object is required with master data tables');
                return;
            }

            const result = await InitialSyncService.syncMasterData(
                { tenantId, branchId, terminalId },
                data
            );

            const message = result.success
                ? `Initial sync completed. Inserted: ${result.summary.insertedRecords}, Skipped: ${result.summary.skippedRecords}`
                : `Initial sync completed with errors. Inserted: ${result.summary.insertedRecords}, Failed: ${result.summary.failedRecords}`;

            BaseController.sendResponse(res, result.success ? 200 : 207, result.success, message, result);
        } catch (error: any) {
            console.error('Error syncing initial master data:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  syncStepData
     * @desc    Sync data for a specific onboarding step
     *          E.g., PRODUCTS_SYNC will sync products, productVariants, productBarcodes, variantBarcodes
     * @body    { tenantId, branchId, terminalId, stepType, data: { ... } }
     */
    static async syncStepData(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, terminalId, stepType, data } = req.body;

            if (!tenantId || !branchId || !terminalId) {
                BaseController.sendResponse(res, 400, false, 'tenantId, branchId, and terminalId are required');
                return;
            }

            if (!stepType) {
                BaseController.sendResponse(res, 400, false, 'stepType is required');
                return;
            }

            if (!data || typeof data !== 'object') {
                BaseController.sendResponse(res, 400, false, 'data object is required');
                return;
            }

            const result = await InitialSyncService.syncStepTables(
                stepType as OnboardingStepType,
                { tenantId, branchId, terminalId },
                data
            );

            const message = result.success
                ? `Step sync completed. Inserted: ${result.summary.insertedRecords}, Skipped: ${result.summary.skippedRecords}`
                : `Step sync completed with errors. Inserted: ${result.summary.insertedRecords}, Failed: ${result.summary.failedRecords}`;

            BaseController.sendResponse(res, result.success ? 200 : 207, result.success, message, result);
        } catch (error: any) {
            console.error('Error syncing step data:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  getInitialSyncTables
     * @desc    Get list of tables that need to be synced during initial data load
     *          Useful for the client to know what data to fetch from cloud
     */
    static async getInitialSyncTables(_req: Request, res: Response): Promise<void> {
        try {
            BaseController.sendResponse(res, 200, true, 'Initial sync tables retrieved', {
                tables: INITIAL_SYNC_TABLES,
                description: 'Tables listed in dependency order - sync in this order to respect foreign keys'
            });
        } catch (error: any) {
            console.error('Error getting initial sync tables:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    // ==========================================
    // PAGINATED MASTER DATA FETCH METHODS
    // ==========================================

    /**
     * @method  fetchMasterDataTable
     * @desc    Fetch data from a specific master data table with pagination
     * @query   table - Table name to fetch
     * @query   cursor - Cursor for pagination (optional)
     * @query   limit - Number of records per page (default: 500, max: 1000)
     * @query   since - Fetch only records updated after this timestamp (optional)
     * @body    { tenantId, branchId }
     */
    static async fetchMasterDataTable(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;
            const table = req.query.table as string;
            const cursor = req.query.cursor as string | undefined;
            const limit = parseInt(req.query.limit as string) || 500;
            const since = req.query.since as string | undefined;

            if (!table) {
                BaseController.sendResponse(res, 400, false, 'table query parameter is required');
                return;
            }

            if (!INITIAL_SYNC_TABLES.includes(table as InitialSyncTable)) {
                BaseController.sendResponse(res, 400, false, `Invalid table. Valid tables: ${INITIAL_SYNC_TABLES.join(', ')}`);
                return;
            }

            const result = await MasterDataFetchService.fetchTable(
                table as InitialSyncTable,
                { tenantId: tenantId || '', branchId: branchId || '' },
                { cursor, limit, since }
            );

            BaseController.sendResponse(res, 200, true, `Fetched ${result.pagination.fetched} ${table} records`, result);
        } catch (error: any) {
            console.error('Error fetching master data table:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  fetchAllMasterData
     * @desc    Fetch all master data for initial sync with pagination support
     *          Returns all data in dependency order for proper foreign key relationships
     * @body    { tenantId, branchId, tables?: string[], batchSize?: number, since?: string }
     */
    static async fetchAllMasterData(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, tables, batchSize, since } = req.body;

            // Validate tables if provided
            if (tables && Array.isArray(tables)) {
                const invalidTables = tables.filter(t => !INITIAL_SYNC_TABLES.includes(t as InitialSyncTable));
                if (invalidTables.length > 0) {
                    BaseController.sendResponse(res, 400, false, `Invalid tables: ${invalidTables.join(', ')}`);
                    return;
                }
            }

            const result = await MasterDataFetchService.fetchAllMasterData(
                { tenantId: tenantId || '', branchId: branchId || '' },
                {
                    tables: tables as InitialSyncTable[] | undefined,
                    batchSize,
                    since,
                }
            );

            const message = result.success
                ? `Fetched ${result.totalRecords} total records from ${Object.keys(result.tables).length} tables`
                : `Fetch completed with errors. Got ${result.totalRecords} records`;

            BaseController.sendResponse(res, result.success ? 200 : 207, result.success, message, result);
        } catch (error: any) {
            console.error('Error fetching all master data:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  getTableCounts
     * @desc    Get record counts for all master data tables
     *          Useful for progress estimation before initial sync
     * @body    { tenantId, branchId, tables?: string[] }
     */
    static async getTableCounts(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, tables } = req.body;

            // Validate tables if provided
            let tablesToCount = [...INITIAL_SYNC_TABLES];
            if (tables && Array.isArray(tables)) {
                const invalidTables = tables.filter(t => !INITIAL_SYNC_TABLES.includes(t as InitialSyncTable));
                if (invalidTables.length > 0) {
                    BaseController.sendResponse(res, 400, false, `Invalid tables: ${invalidTables.join(', ')}`);
                    return;
                }
                tablesToCount = tables as InitialSyncTable[];
            }

            const counts = await MasterDataFetchService.getTableCounts(
                { tenantId: tenantId || '', branchId: branchId || '' },
                tablesToCount
            );

            const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

            BaseController.sendResponse(res, 200, true, `Got counts for ${Object.keys(counts).length} tables`, {
                counts,
                totalRecords,
                tables: tablesToCount,
            });
        } catch (error: any) {
            console.error('Error getting table counts:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  fetchProducts
     * @desc    Fetch products with pagination (optimized with related data)
     * @body    { tenantId, branchId }
     * @query   cursor, limit, since
     */
    static async fetchProductsPaginated(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;
            const cursor = req.query.cursor as string | undefined;
            const limit = parseInt(req.query.limit as string) || 500;
            const since = req.query.since as string | undefined;

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const result = await MasterDataFetchService.fetchProducts(
                { tenantId, branchId },
                { cursor, limit, since }
            );

            BaseController.sendResponse(res, 200, true, `Fetched ${result.pagination.fetched} products`, result);
        } catch (error: any) {
            console.error('Error fetching products:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  fetchInventoryPaginated
     * @desc    Fetch inventory with pagination (optimized with product/variant details)
     * @body    { tenantId, branchId }
     * @query   cursor, limit, since
     */
    static async fetchInventoryPaginated(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;
            const cursor = req.query.cursor as string | undefined;
            const limit = parseInt(req.query.limit as string) || 500;
            const since = req.query.since as string | undefined;

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const result = await MasterDataFetchService.fetchInventory(
                { tenantId, branchId },
                { cursor, limit, since }
            );

            BaseController.sendResponse(res, 200, true, `Fetched ${result.pagination.fetched} inventory records`, result);
        } catch (error: any) {
            console.error('Error fetching inventory:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  fetchCategoriesPaginated
     * @desc    Fetch categories with pagination
     * @body    { tenantId, branchId }
     * @query   cursor, limit, since
     */
    static async fetchCategoriesPaginated(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;
            const cursor = req.query.cursor as string | undefined;
            const limit = parseInt(req.query.limit as string) || 500;
            const since = req.query.since as string | undefined;

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const result = await MasterDataFetchService.fetchCategories(
                { tenantId, branchId },
                { cursor, limit, since }
            );

            BaseController.sendResponse(res, 200, true, `Fetched ${result.pagination.fetched} categories`, result);
        } catch (error: any) {
            console.error('Error fetching categories:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  fetchCustomersPaginated
     * @desc    Fetch customers with pagination
     * @body    { tenantId, branchId }
     * @query   cursor, limit, since
     */
    static async fetchCustomersPaginated(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;
            const cursor = req.query.cursor as string | undefined;
            const limit = parseInt(req.query.limit as string) || 500;
            const since = req.query.since as string | undefined;

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const result = await MasterDataFetchService.fetchCustomers(
                { tenantId, branchId },
                { cursor, limit, since }
            );

            BaseController.sendResponse(res, 200, true, `Fetched ${result.pagination.fetched} customers`, result);
        } catch (error: any) {
            console.error('Error fetching customers:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }

    /**
     * @method  fetchUsersPaginated
     * @desc    Fetch users with pagination (excluding password hash for security)
     * @body    { tenantId, branchId }
     * @query   cursor, limit, since
     */
    static async fetchUsersPaginated(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, branchId } = req.body;
            const cursor = req.query.cursor as string | undefined;
            const limit = parseInt(req.query.limit as string) || 500;
            const since = req.query.since as string | undefined;

            if (!tenantId || !branchId) {
                BaseController.sendResponse(res, 400, false, 'tenantId and branchId are required');
                return;
            }

            const result = await MasterDataFetchService.fetchUsers(
                { tenantId, branchId },
                { cursor, limit, since }
            );

            BaseController.sendResponse(res, 200, true, `Fetched ${result.pagination.fetched} users`, result);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            BaseController.sendResponse(res, 500, false, error.message || 'Internal server error');
        }
    }
}
