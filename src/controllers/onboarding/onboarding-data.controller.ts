import { Request, Response } from "express";
import { BaseController } from "../base.controller";
import { OnboardingFetchService } from "../../services/onboarding/onboarding-fetch.service";
import { OnboardingSyncService } from "../../services/onboarding/onboarding-sync.service";

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
}
