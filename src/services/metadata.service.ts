import axios from 'axios';
import prisma from '../databases/prisma/client';
import { RoleModel } from "../models/role.model";
import { PermissionModel } from "../models/permission.model";
import { RolePermissionModel } from "../models/role-permission.model";
import { SubscriptionPlanModel } from "../models/subscription-plan.model";
import { PaymentServiceProviderModel } from "../models/payment-service-provider.model";
import { PaymentMethodModel } from '../models/payment-methods.model';
import { SubscriptionModel } from '../models/subscription.model';
import { UserModel } from '../models/user.model';
import { CustomerModel } from '../models/customer.model';
import { CategoryModel } from '../models/category.model';
import { ValidationParams } from 'on-boarding';

const API_TIMEOUT = 30000;

interface SyncResult {
    type: string;
    success: boolean;
    recordsProcessed: number;
    recordsInserted: number;
    recordsUpdated: number;
    errors: string[];
}

export class MetadataService {
    private static params;

    constructor(req: Request) {
        MetadataService.params = req.body
    }

    /**
     * Fetch data from external API
     */
    private static async fetchFromExternalAPI(endpoint: string, params: ValidationParams): Promise<any> {
        try {
            const host = process.env.API_HOST || 'localhost'
            const port = process.env.API_PORT || '3000'
            const url = `http://${host}:${port}/api/v1${endpoint}`;

            const response = await axios.post(url,
                params,
                {
                    timeout: API_TIMEOUT,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.status !== 200) {
                throw new Error(`API returned status ${response.status}`);
            }

            return response.data;
        } catch (error: any) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout - external API took too long to respond');
            }
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Connection refused - external API is not accessible');
            }
            throw new Error(`Failed to fetch from external API: ${error.message}`);
        }
    }

    /**
     * Sync roles from external API
     */
    static async syncRoles(params: ValidationParams): Promise<SyncResult> {
        const result: SyncResult = {
            type: 'roles',
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: []
        };

        try {
            const response = await this.fetchFromExternalAPI('/account-seeds/roles', params);
            const roles = response.data || response;

            if (!Array.isArray(roles)) {
                throw new Error('Invalid response format - expected array of roles');
            }

            result.recordsProcessed = roles.length;

            for (const roleData of roles) {
                try {
                    const existingRole = await RoleModel.findById(roleData.roleId);

                    if (existingRole) {
                        await RoleModel.update(roleData.roleId, {
                            ...roleData,
                            updatedAt: new Date()
                        });
                        result.recordsUpdated++;
                    } else {
                        await RoleModel.create({
                            ...roleData,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        result.recordsInserted++;
                    }
                } catch (error: any) {
                    result.errors.push(`Role ${roleData.roleId}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error: any) {
            result.errors.push(error.message);
            throw new Error(`Failed to sync roles: ${error.message}`);
        }
    }

    /**
     * Sync permissions from external API
     */
    static async syncPermissions(params: ValidationParams): Promise<SyncResult> {
        const result: SyncResult = {
            type: 'permissions',
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: []
        };

        try {
            const response = await this.fetchFromExternalAPI('/account-seeds/permissions', params);
            const permissions = response.data || response;

            if (!Array.isArray(permissions)) {
                throw new Error('Invalid response format - expected array of permissions');
            }

            result.recordsProcessed = permissions.length;

            for (const permissionData of permissions) {
                try {
                    const existingPermission = await PermissionModel.findById(permissionData.permissionId);

                    if (existingPermission) {
                        await PermissionModel.update(permissionData.permissionId, {
                            ...permissionData,
                            updatedAt: new Date()
                        });
                        result.recordsUpdated++;
                    } else {
                        await PermissionModel.create({
                            ...permissionData,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        result.recordsInserted++;
                    }
                } catch (error: any) {
                    result.errors.push(`Permission ${permissionData.permissionId}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error: any) {
            result.errors.push(error.message);
            throw new Error(`Failed to sync permissions: ${error.message}`);
        }
    }

    /**
     * Sync role-permissions from external API
     */
    static async syncRolePermissions(params: ValidationParams): Promise<SyncResult> {
        const result: SyncResult = {
            type: 'role-permissions',
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: []
        };

        try {
            const response = await this.fetchFromExternalAPI('/account-seeds/role-permissions', params);
            const rolePermissions = response.data || response;

            if (!Array.isArray(rolePermissions)) {
                throw new Error('Invalid response format - expected array of role-permissions');
            }

            result.recordsProcessed = rolePermissions.length;

            for (const rpData of rolePermissions) {
                try {
                    const existing = await RolePermissionModel.findByRoleAndPermissionId(
                        rpData.roleId,
                        rpData.permissionId
                    );

                    if (!existing) {
                        await RolePermissionModel.create(rpData);
                        result.recordsInserted++;
                    } else {
                        result.recordsUpdated++;
                    }
                } catch (error: any) {
                    result.errors.push(`RolePermission ${rpData.roleId}-${rpData.permissionId}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error: any) {
            result.errors.push(error.message);
            throw new Error(`Failed to sync role-permissions: ${error.message}`);
        }
    }

    /**
     * Sync default user from external API
     */
    static async syncDefaultUser(params: ValidationParams): Promise<SyncResult> {
        const result: SyncResult = {
            type: 'default-user',
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: []
        };

        try {
            const response = await this.fetchFromExternalAPI('/account-seeds/default-user', params);
            const userData = response.data || response;

            if (!Array.isArray(userData)) {
                throw new Error('Invalid response format - expected array of users');
            }

            result.recordsProcessed = userData.length;

            for (const data of userData) {
                try {
                    // Validate that required relations exist
                    const tenant = await prisma.tenant.findUnique({ where: { tenantId: data.tenantId } });
                    if (!tenant) {
                        throw new Error(`Tenant ${data.tenantId} does not exist. Please create tenant first.`);
                    }

                    const branch = await prisma.branch.findUnique({ where: { branchId: data.branchId } });
                    if (!branch) {
                        throw new Error(`Branch ${data.branchId} does not exist. Please create branch first.`);
                    }

                    const role = await prisma.role.findUnique({ where: { roleId: data.roleId } });
                    if (!role) {
                        throw new Error(`Role ${data.roleId} does not exist. Please sync roles first.`);
                    }

                    const existingUser = await UserModel.findById(data.userId);

                    if (existingUser) {
                        await UserModel.update(data.userId, {
                            ...data,
                            updatedAt: new Date()
                        });
                        result.recordsUpdated++;
                    } else {
                        await UserModel.create({
                            ...data,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        result.recordsInserted++;
                    }
                } catch (error: any) {
                    result.errors.push(`User ${data.userId}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error: any) {
            result.errors.push(error.message);
            throw new Error(`Failed to sync default user: ${error.message}`);
        }
    }

    /**
     * Sync customer from external API
     */
    static async syncCustomer(params: ValidationParams): Promise<SyncResult> {
        const result: SyncResult = {
            type: 'customer',
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: []
        };

        try {
            const response = await this.fetchFromExternalAPI('/account-seeds/customer', params);
            const customerData = response.data || response;

            if (!Array.isArray(customerData)) {
                throw new Error('Invalid response format - expected array of customer');
            }

            result.recordsProcessed = customerData.length;

            for (const data of customerData) {
                try {
                    const existingRole = await CustomerModel.findById(data.customerId);

                    if (existingRole) {
                        await CustomerModel.update(data.customerId, {
                            ...data,
                            updatedAt: new Date()
                        });
                        result.recordsUpdated++;
                    } else {
                        await CustomerModel.create({
                            ...data,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        result.recordsInserted++;
                    }
                } catch (error: any) {
                    result.errors.push(`User ${data.customerId}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error: any) {
            result.errors.push(error.message);
            throw new Error(`Failed to sync customer: ${error.message}`);
        }
    }

    /**
     * Sync category from external API
     */
    static async syncCategory(params: ValidationParams): Promise<SyncResult> {
        const result: SyncResult = {
            type: 'category',
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: []
        };

        try {
            const response = await this.fetchFromExternalAPI('/account-seeds/category', params);
            const categoryData = response.data || response;

            if (!Array.isArray(categoryData)) {
                throw new Error('Invalid response format - expected array of category');
            }

            result.recordsProcessed = categoryData.length;

            for (const data of categoryData) {
                try {
                    const existingRole = await CategoryModel.findById(data.categoryId);

                    if (existingRole) {
                        await CategoryModel.update(data.categoryId, {
                            ...data,
                            updatedAt: new Date()
                        });
                        result.recordsUpdated++;
                    } else {
                        await CategoryModel.create({
                            ...data,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        result.recordsInserted++;
                    }
                } catch (error: any) {
                    result.errors.push(`User ${data.categoryId}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error: any) {
            result.errors.push(error.message);
            throw new Error(`Failed to sync category: ${error.message}`);
        }
    }

    /**
     * Sync subscription plans from external API
     */
    static async syncSubscriptionPlans(params: ValidationParams): Promise<SyncResult> {
        const result: SyncResult = {
            type: 'subscription-plans',
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: []
        };

        try {
            const response = await this.fetchFromExternalAPI('/account-seeds/subscription-plans', params);
            const subscriptionPlans = response.data || response;

            if (!Array.isArray(subscriptionPlans)) {
                throw new Error('Invalid response format - expected array of subscription plans');
            }

            result.recordsProcessed = subscriptionPlans.length;

            for (const planData of subscriptionPlans) {
                try {
                    const existingPlan = await SubscriptionPlanModel.findById(planData.planId);

                    if (existingPlan) {
                        await SubscriptionPlanModel.update(planData.planId, {
                            ...planData,
                            updatedAt: new Date()
                        });
                        result.recordsUpdated++;
                    } else {
                        await SubscriptionPlanModel.create({
                            ...planData,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        result.recordsInserted++;
                    }
                } catch (error: any) {
                    result.errors.push(`Subscription plan ${planData.planId}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error: any) {
            result.errors.push(error.message);
            throw new Error(`Failed to sync subscription plans: ${error.message}`);
        }
    }

    /**
     * Sync tenant subscription from external API
     */
    static async syncTenantSubscription(params: ValidationParams): Promise<SyncResult> {
        const result: SyncResult = {
            type: 'tenant-subscription',
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: []
        };

        try {
            const response = await this.fetchFromExternalAPI('/account-seeds/tenant-subscription', params);
            const tenantSubscriptions = response.data || response;

            if (!Array.isArray(tenantSubscriptions)) {
                throw new Error('Invalid response format - expected array of tenant subscriptions');
            }

            result.recordsProcessed = tenantSubscriptions.length;

            for (const subscriptionData of tenantSubscriptions) {
                try {
                    const existingSubscription = await SubscriptionModel.findById(subscriptionData.subscriptionId);

                    if (existingSubscription) {
                        await SubscriptionModel.update(subscriptionData.subscriptionId, {
                            ...subscriptionData,
                            updatedAt: new Date()
                        });
                        result.recordsUpdated++;
                    } else {
                        await SubscriptionModel.create({
                            ...subscriptionData,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        result.recordsInserted++;
                    }
                } catch (error: any) {
                    result.errors.push(`Tenant subscription ${subscriptionData.subscriptionId}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error: any) {
            result.errors.push(error.message);
            throw new Error(`Failed to sync tenant subscription: ${error.message}`);
        }
    }

    /**
     * Sync payment methods from external API
     */
    static async syncPaymentMethods(params: ValidationParams): Promise<SyncResult> {
        const result: SyncResult = {
            type: 'payment-methods',
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: []
        };

        try {
            const response = await this.fetchFromExternalAPI('/account-seeds/payment-methods', params);
            const paymentMethods = response.data || response;

            if (!Array.isArray(paymentMethods)) {
                throw new Error('Invalid response format - expected array of payment methods');
            }

            result.recordsProcessed = paymentMethods.length;

            for (const methodData of paymentMethods) {
                try {
                    const existingMethod = await PaymentMethodModel.findById(methodData.methodId);

                    if (existingMethod) {
                        await PaymentMethodModel.update(methodData.methodId, {
                            ...methodData,
                            updatedAt: new Date()
                        });
                        result.recordsUpdated++;
                    } else {
                        await PaymentMethodModel.create({
                            ...methodData,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        result.recordsInserted++;
                    }
                } catch (error: any) {
                    result.errors.push(`Payment method ${methodData.methodId}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error: any) {
            result.errors.push(error.message);
            throw new Error(`Failed to sync payment methods: ${error.message}`);
        }
    }

    /**
     * Sync payment service provider from external API
     */
    static async syncPaymentServiceProvider(params: ValidationParams): Promise<SyncResult> {
        const result: SyncResult = {
            type: 'payment-service-provider',
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: []
        };

        try {
            const response = await this.fetchFromExternalAPI('/account-seeds/payment-service-provider', params);
            const providers = response.data || response;

            if (!Array.isArray(providers)) {
                throw new Error('Invalid response format - expected array of payment service providers');
            }

            result.recordsProcessed = providers.length;

            for (const providerData of providers) {
                try {
                    const existingProvider = await PaymentServiceProviderModel.findById(providerData.providerId);

                    if (existingProvider) {
                        await PaymentServiceProviderModel.update(providerData.providerId, {
                            ...providerData,
                            updatedAt: new Date()
                        });
                        result.recordsUpdated++;
                    } else {
                        await PaymentServiceProviderModel.create({
                            ...providerData,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        result.recordsInserted++;
                    }
                } catch (error: any) {
                    result.errors.push(`Payment service provider ${providerData.providerId}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error: any) {
            result.errors.push(error.message);
            throw new Error(`Failed to sync payment service provider: ${error.message}`);
        }
    }

    /**
     * Sync all metadata
     */
    static async syncAllMetadata(params: ValidationParams): Promise<{
        results: SyncResult[];
        overallSuccess: boolean;
        totalProcessed: number;
        totalInserted: number;
        totalUpdated: number;
    }> {
        const results: SyncResult[] = [];

        try {
            // Sync in order of dependencies
            results.push(await this.syncRoles(params));
            results.push(await this.syncPermissions(params));
            results.push(await this.syncRolePermissions(params));
            results.push(await this.syncDefaultUser(params));
            results.push(await this.syncCustomer(params));
            results.push(await this.syncCategory(params));
            results.push(await this.syncSubscriptionPlans(params));
            results.push(await this.syncTenantSubscription(params));
            results.push(await this.syncPaymentMethods(params));
            results.push(await this.syncPaymentServiceProvider(params));

            const overallSuccess = results.every(r => r.success);
            const totalProcessed = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
            const totalInserted = results.reduce((sum, r) => sum + r.recordsInserted, 0);
            const totalUpdated = results.reduce((sum, r) => sum + r.recordsUpdated, 0);

            return {
                results,
                overallSuccess,
                totalProcessed,
                totalInserted,
                totalUpdated
            };

        } catch (error: any) {
            throw new Error(`Failed to sync all metadata: ${error.message}`);
        }
    }

    /**
     * Get sync status
     */
    static async getSyncStatus(params: ValidationParams): Promise<any> {
        try {
            const rolesCount = await RoleModel.count();
            const permissionsCount = await PermissionModel.count();
            // const subscriptionPlansCount = await SubscriptionPlanModel.count();
            const tenantSubscriptionsCount = await SubscriptionModel.count();
            const paymentMethodsCount = await PaymentMethodModel.count();
            const paymentProvidersCount = await PaymentServiceProviderModel.count();

            return {
                roles: rolesCount,
                permissions: permissionsCount,
                // subscriptionPlans: subscriptionPlansCount,
                tenantSubscriptions: tenantSubscriptionsCount,
                paymentMethods: paymentMethodsCount,
                paymentServiceProviders: paymentProvidersCount,
                lastSyncedAt: new Date(),
                status: 'ready'
            };
        } catch (error: any) {
            throw new Error(`Failed to get sync status: ${error.message} ${params}`);
        }
    }
}