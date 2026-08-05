import { Request, Response } from "express";
import { BaseController } from "../base.controller";
import { OnboardingFetchService } from "../../services/onboarding/onboarding-fetch.service";
import { OnboardingSyncService } from "../../services/onboarding/onboarding-sync.service";
import { InitialSyncService, INITIAL_SYNC_TABLES } from "../../services/onboarding/initial-sync.service";
import { MasterDataFetchService } from "../../services/onboarding/master-data-fetch.service";
import {
    getErrorMessage,
    mapErrorToStatusCode
} from "../../services/onboarding/errors";
import {
    validateTenantBranchParams,
    validateOnboardingParams,
    validateArrayField,
    validateDataObject,
    validateTableName,
    validateTableList,
    validateStepType,
    parsePaginationParams,
    parseOptionalTenantBranchParams,
} from "../../services/onboarding/validation";
import {
    ONBOARDING_MESSAGES,
    HTTP_STATUS,
    InitialSyncTable
} from "../../services/onboarding/constants";
import type { OnboardingStepType } from 'on-boarding';

/**
 * Error handling helper for controller methods
 */
function handleError(res: Response, error: unknown, context: string): void {
    console.error(`Error ${context}:`, error);

    const statusCode = mapErrorToStatusCode(error);
    const message = getErrorMessage(error);

    BaseController.sendResponse(res, statusCode, false, message);
}

/**
 * @class   OnboardingDataController
 * @desc    Handles onboarding data fetch and sync HTTP requests
 */
export class OnboardingDataController {
    // Fetch Methods (Local Database)
    static async fetchSubscriptionPlans(req: Request, res: Response): Promise<void> {
        try {
            const params = validateTenantBranchParams(req);
            const plans = await OnboardingFetchService.fetchSubscriptionPlans(params);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.FETCH_COMPLETED('subscription plans', plans.length), plans);
        } catch (error) {
            handleError(res, error, 'fetching subscription plans');
        }
    }

    static async fetchPaymentMethods(req: Request, res: Response): Promise<void> {
        try {
            const params = validateTenantBranchParams(req);
            const paymentMethods = await OnboardingFetchService.fetchPaymentMethods(params);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.FETCH_COMPLETED('payment methods', paymentMethods.length), paymentMethods);
        } catch (error) {
            handleError(res, error, 'fetching payment methods');
        }
    }

    static async fetchPaymentServiceProviders(req: Request, res: Response): Promise<void> {
        try {
            const params = validateTenantBranchParams(req);
            const providers = await OnboardingFetchService.fetchPaymentServiceProviders(params);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.FETCH_COMPLETED('payment service providers', providers.length), providers);
        } catch (error) {
            handleError(res, error, 'fetching payment service providers');
        }
    }

    static async fetchCategories(req: Request, res: Response): Promise<void> {
        try {
            const params = validateTenantBranchParams(req);
            const categories = await OnboardingFetchService.fetchCategories(params);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.FETCH_COMPLETED('categories', categories.length), categories);
        } catch (error) {
            handleError(res, error, 'fetching categories');
        }
    }

    static async fetchCustomers(req: Request, res: Response): Promise<void> {
        try {
            const params = validateTenantBranchParams(req);
            const customers = await OnboardingFetchService.fetchCustomers(params);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.FETCH_COMPLETED('customers', customers.length), customers);
        } catch (error) {
            handleError(res, error, 'fetching customers');
        }
    }

    // Sync Methods (Cloud -> Local)
    static async syncSubscriptionPlans(req: Request, res: Response): Promise<void> {
        try {
            const plans = validateArrayField(req.body.plans, 'plans') as any[];
            const syncResult = await OnboardingSyncService.syncSubscriptionPlans(plans);
            const message = ONBOARDING_MESSAGES.SYNC_COMPLETED(
                'Subscription plans',
                syncResult.summary.saved,
                syncResult.summary.skipped,
                syncResult.summary.failed
            );
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, message, syncResult);
        } catch (error) {
            handleError(res, error, 'syncing subscription plans');
        }
    }

    static async syncPaymentMethods(req: Request, res: Response): Promise<void> {
        try {
            const paymentMethods = validateArrayField(req.body.paymentMethods, 'paymentMethods') as any[];
            const params = validateTenantBranchParams(req);
            const syncResult = await OnboardingSyncService.syncPaymentMethods(paymentMethods, params.tenantId, params.branchId);
            const message = ONBOARDING_MESSAGES.SYNC_COMPLETED(
                'Payment methods',
                syncResult.summary.saved,
                syncResult.summary.skipped,
                syncResult.summary.failed
            );
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, message, syncResult);
        } catch (error) {
            handleError(res, error, 'syncing payment methods');
        }
    }

    static async syncPaymentServiceProviders(req: Request, res: Response): Promise<void> {
        try {
            const providers = validateArrayField(req.body.providers, 'providers') as any[];
            const syncResult = await OnboardingSyncService.syncPaymentServiceProviders(providers);
            const message = ONBOARDING_MESSAGES.SYNC_COMPLETED(
                'Payment service providers',
                syncResult.summary.saved,
                syncResult.summary.skipped,
                syncResult.summary.failed
            );
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, message, syncResult);
        } catch (error) {
            handleError(res, error, 'syncing payment service providers');
        }
    }

    static async syncCategories(req: Request, res: Response): Promise<void> {
        try {
            const categories = validateArrayField(req.body.categories, 'categories') as any[];
            const syncResult = await OnboardingSyncService.syncCategories(categories);
            const message = ONBOARDING_MESSAGES.SYNC_COMPLETED(
                'Categories',
                syncResult.summary.saved,
                syncResult.summary.skipped,
                syncResult.summary.failed
            );
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, message, syncResult);
        } catch (error) {
            handleError(res, error, 'syncing categories');
        }
    }

    static async syncCustomers(req: Request, res: Response): Promise<void> {
        try {
            const customers = validateArrayField(req.body.customers, 'customers') as any[];
            const syncResult = await OnboardingSyncService.syncCustomers(customers);
            const message = ONBOARDING_MESSAGES.SYNC_COMPLETED(
                'Customers',
                syncResult.summary.saved,
                syncResult.summary.skipped,
                syncResult.summary.failed
            );
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, message, syncResult);
        } catch (error) {
            handleError(res, error, 'syncing customers');
        }
    }

    // Initial Sync Methods
    static async syncInitialMasterData(req: Request, res: Response): Promise<void> {
        try {
            const params = validateOnboardingParams(req);
            const data = validateDataObject(req.body.data);

            const result = await InitialSyncService.syncMasterData(params, data);

            const message = result.success
                ? ONBOARDING_MESSAGES.INITIAL_SYNC_COMPLETED(result.summary.insertedRecords, result.summary.skippedRecords)
                : ONBOARDING_MESSAGES.INITIAL_SYNC_WITH_ERRORS(result.summary.insertedRecords, result.summary.failedRecords);

            BaseController.sendResponse(
                res,
                result.success ? HTTP_STATUS.OK : HTTP_STATUS.MULTI_STATUS,
                result.success,
                message,
                result
            );
        } catch (error) {
            handleError(res, error, 'syncing initial master data');
        }
    }

    static async syncStepData(req: Request, res: Response): Promise<void> {
        try {
            const params = validateOnboardingParams(req);
            const stepType = validateStepType(req.body.stepType);
            const data = validateDataObject(req.body.data);

            const result = await InitialSyncService.syncStepTables(
                stepType as OnboardingStepType,
                params,
                data
            );

            const message = result.success
                ? ONBOARDING_MESSAGES.STEP_SYNC_COMPLETED(result.summary.insertedRecords, result.summary.skippedRecords)
                : ONBOARDING_MESSAGES.STEP_SYNC_WITH_ERRORS(result.summary.insertedRecords, result.summary.failedRecords);

            BaseController.sendResponse(
                res,
                result.success ? HTTP_STATUS.OK : HTTP_STATUS.MULTI_STATUS,
                result.success,
                message,
                result
            );
        } catch (error) {
            handleError(res, error, 'syncing step data');
        }
    }

    static async getInitialSyncTables(_req: Request, res: Response): Promise<void> {
        try {
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.TABLES_RETRIEVED, {
                tables: INITIAL_SYNC_TABLES,
                description: 'Tables listed in dependency order - sync in this order to respect foreign keys'
            });
        } catch (error) {
            handleError(res, error, 'getting initial sync tables');
        }
    }

    // Paginated Master Data Fetch Methods
    static async fetchMasterDataTable(req: Request, res: Response): Promise<void> {
        try {
            const params = parseOptionalTenantBranchParams(req);
            const table = validateTableName(req.query.table);
            const pagination = parsePaginationParams(req);

            const result = await MasterDataFetchService.fetchTable(
                table,
                params,
                pagination
            );

            BaseController.sendResponse(
                res,
                HTTP_STATUS.OK,
                true,
                ONBOARDING_MESSAGES.FETCH_COMPLETED(`${table} records`, result.pagination.fetched),
                result
            );
        } catch (error) {
            handleError(res, error, 'fetching master data table');
        }
    }

    static async fetchAllMasterData(req: Request, res: Response): Promise<void> {
        try {
            const params = parseOptionalTenantBranchParams(req);
            const { tables, batchSize, since } = req.body;
            const validatedTables = validateTableList(tables);

            const result = await MasterDataFetchService.fetchAllMasterData(params, {
                tables: validatedTables,
                batchSize,
                since,
            });

            const message = result.success
                ? ONBOARDING_MESSAGES.ALL_DATA_FETCHED(result.totalRecords, Object.keys(result.tables).length)
                : `Fetch completed with errors. Got ${result.totalRecords} records`;

            BaseController.sendResponse(
                res,
                result.success ? HTTP_STATUS.OK : HTTP_STATUS.MULTI_STATUS,
                result.success,
                message,
                result
            );
        } catch (error) {
            handleError(res, error, 'fetching all master data');
        }
    }

    static async getTableCounts(req: Request, res: Response): Promise<void> {
        try {
            const params = parseOptionalTenantBranchParams(req);
            const { tables } = req.body;
            const validatedTables = validateTableList(tables) || [...INITIAL_SYNC_TABLES];

            const counts = await MasterDataFetchService.getTableCounts(params, validatedTables as InitialSyncTable[]);
            const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.COUNTS_RETRIEVED(Object.keys(counts).length), {
                counts,
                totalRecords,
                tables: validatedTables,
            });
        } catch (error) {
            handleError(res, error, 'getting table counts');
        }
    }

    // Table-Specific Paginated Fetch
    static async fetchProductsPaginated(req: Request, res: Response): Promise<void> {
        try {
            const params = validateTenantBranchParams(req);
            const pagination = parsePaginationParams(req);
            const result = await MasterDataFetchService.fetchProducts(params, pagination);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.FETCH_COMPLETED('products', result.pagination.fetched), result);
        } catch (error) {
            handleError(res, error, 'fetching products');
        }
    }

    static async fetchInventoryPaginated(req: Request, res: Response): Promise<void> {
        try {
            const params = validateTenantBranchParams(req);
            const pagination = parsePaginationParams(req);
            const result = await MasterDataFetchService.fetchInventory(params, pagination);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.FETCH_COMPLETED('inventory records', result.pagination.fetched), result);
        } catch (error) {
            handleError(res, error, 'fetching inventory');
        }
    }

    static async fetchCategoriesPaginated(req: Request, res: Response): Promise<void> {
        try {
            const params = validateTenantBranchParams(req);
            const pagination = parsePaginationParams(req);
            const result = await MasterDataFetchService.fetchCategories(params, pagination);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.FETCH_COMPLETED('categories', result.pagination.fetched), result);
        } catch (error) {
            handleError(res, error, 'fetching categories');
        }
    }

    static async fetchCustomersPaginated(req: Request, res: Response): Promise<void> {
        try {
            const params = validateTenantBranchParams(req);
            const pagination = parsePaginationParams(req);
            const result = await MasterDataFetchService.fetchCustomers(params, pagination);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.FETCH_COMPLETED('customers', result.pagination.fetched), result);
        } catch (error) {
            handleError(res, error, 'fetching customers');
        }
    }

    static async fetchUsersPaginated(req: Request, res: Response): Promise<void> {
        try {
            const params = validateTenantBranchParams(req);
            const pagination = parsePaginationParams(req);
            const result = await MasterDataFetchService.fetchUsers(params, pagination);
            BaseController.sendResponse(res, HTTP_STATUS.OK, true, ONBOARDING_MESSAGES.FETCH_COMPLETED('users', result.pagination.fetched), result);
        } catch (error) {
            handleError(res, error, 'fetching users');
        }
    }
}
