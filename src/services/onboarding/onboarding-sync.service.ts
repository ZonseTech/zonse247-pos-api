/* eslint-disable @typescript-eslint/no-unused-vars */
import { SubscriptionPlanModel } from '../../models/subscription-plan.model';
import { PaymentMethodModel } from '../../models/payment-methods.model';
import { PaymentServiceProviderModel } from '../../models/payment-service-provider.model';
import { CategoryModel } from '../../models/category.model';
import { CustomerModel } from '../../models/customer.model';
import { PaymentMethodCreateInput } from '../../databases/prisma/generated/prisma/models';
import type { SubscriptionPlan } from 'subscription';
import type { PaymentMethod } from 'payment-method';
import type { PaymentServiceProvider } from 'payment-service-provider';
import type { Category } from 'categoty';
import type { Customer } from 'customer';

interface SyncResult<T> {
    saved: T[];
    skipped: T[];
    failed: { data: T; error: string }[];
    summary: {
        total: number;
        saved: number;
        skipped: number;
        failed: number;
    };
}

/**
 * @class   OnboardingSyncService
 * @desc    Handles syncing onboarding data to local database
 */
export class OnboardingSyncService {
    /**
     * @method  syncSubscriptionPlans
     * @desc    Sync subscription plans to local database using "exists skip" pattern
     * @param   plans - Array of subscription plans from cloud (passed by client)
     * @returns Promise<SyncResult<SubscriptionPlan>> - Results of sync operation
     */
    static async syncSubscriptionPlans(plans: SubscriptionPlan[]): Promise<SyncResult<SubscriptionPlan>> {
        const result: SyncResult<SubscriptionPlan> = {
            saved: [],
            skipped: [],
            failed: [],
            summary: { total: plans.length, saved: 0, skipped: 0, failed: 0 }
        };

        for (const plan of plans) {
            try {
                const existingPlan = await SubscriptionPlanModel.findById(plan.subscriptionPlanId || (plan as any).planId);

                if (existingPlan) {
                    result.skipped.push(existingPlan);
                    result.summary.skipped++;
                } else {
                    const savedPlan = await SubscriptionPlanModel.create({
                        subscriptionPlanId: plan.subscriptionPlanId || (plan as any).planId,
                        planCode: (plan as any).planCode || plan.name?.toUpperCase().replace(/\s+/g, '_'),
                        name: plan.name,
                        description: plan.description || null,
                        monthlyPrice: plan.monthlyPrice ? parseFloat(String(plan.monthlyPrice)) : 0,
                        yearlyPrice: plan.yearlyPrice ? parseFloat(String(plan.yearlyPrice)) : 0,
                        color: (plan as any).color || null,
                        isPopular: (plan as any).popular || (plan as any).isPopular || false,
                        isActive: plan.isActive !== undefined ? plan.isActive : true,
                        features: (plan.features || []) as any,
                        limits: (plan.limits || {}) as any,
                        notes: (plan as any).notes || null,
                    });
                    result.saved.push(savedPlan);
                    result.summary.saved++;
                }
            } catch (error) {
                result.failed.push({
                    data: plan,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                result.summary.failed++;
            }
        }

        return result;
    }

    /**
     * @method  syncPaymentMethods
     * @desc    Sync payment methods to local database using "exists skip" pattern
     * @param   paymentMethods - Array of payment methods from cloud (passed by client)
     * @returns Promise<SyncResult<PaymentMethod>> - Results of sync operation
     */
    static async syncPaymentMethods(paymentMethods: PaymentMethod[]): Promise<SyncResult<PaymentMethod>> {
        const result: SyncResult<PaymentMethod> = {
            saved: [],
            skipped: [],
            failed: [],
            summary: { total: paymentMethods.length, saved: 0, skipped: 0, failed: 0 }
        };

        for (const method of paymentMethods) {
            try {
                const existingMethod = await PaymentMethodModel.findById(method.methodId);

                if (existingMethod) {
                    result.skipped.push(existingMethod);
                    result.summary.skipped++;
                } else {
                    const savedMethod = await PaymentMethodModel.create({
                        methodId: method.methodId,
                        name: method.name,
                        icon: method.icon || null,
                        sortOrder: method.sortOrder || 0,
                        isActive: method.isActive !== undefined ? method.isActive : true,
                    } as PaymentMethodCreateInput);
                    result.saved.push(savedMethod);
                    result.summary.saved++;
                }
            } catch (error) {
                result.failed.push({
                    data: method,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                result.summary.failed++;
            }
        }

        return result;
    }

    /**
     * @method  syncPaymentServiceProviders
     * @desc    Sync payment service providers to local database using "exists skip" pattern
     * @param   providers - Array of payment service providers from cloud (passed by client)
     * @returns Promise<SyncResult<PaymentServiceProvider>> - Results of sync operation
     */
    static async syncPaymentServiceProviders(providers: PaymentServiceProvider[]): Promise<SyncResult<PaymentServiceProvider>> {
        const result: SyncResult<PaymentServiceProvider> = {
            saved: [],
            skipped: [],
            failed: [],
            summary: { total: providers.length, saved: 0, skipped: 0, failed: 0 }
        };

        for (const provider of providers) {
            try {
                const existingProvider = await PaymentServiceProviderModel.findById(provider.providerId);

                if (existingProvider) {
                    result.skipped.push(existingProvider);
                    result.summary.skipped++;
                } else {
                    const savedProvider = await PaymentServiceProviderModel.create({
                        providerId: provider.providerId,
                        name: provider.name,
                        type: provider.type || 'bank',
                        userId: provider.userId,
                        logoUrl: provider.logoUrl || null,
                        synced: 1
                    } as unknown as PaymentServiceProvider);
                    result.saved.push(savedProvider);
                    result.summary.saved++;
                }
            } catch (error) {
                result.failed.push({
                    data: provider,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                result.summary.failed++;
            }
        }

        return result;
    }

    /**
     * @method  syncCategories
     * @desc    Sync categories to local database using "exists skip" pattern
     * @param   categories - Array of categories from cloud (passed by client)
     * @returns Promise<SyncResult<Category>> - Results of sync operation
     */
    static async syncCategories(categories: Category[]): Promise<SyncResult<Category>> {
        const result: SyncResult<Category> = {
            saved: [],
            skipped: [],
            failed: [],
            summary: { total: categories.length, saved: 0, skipped: 0, failed: 0 }
        };

        for (const categoryData of categories) {
            try {
                // Remove relation objects that shouldn't be passed to Prisma
                const { branch, tenant, products, inventories, ...categoryFields } = categoryData as any;

                const categoryId = categoryFields.categoryId;

                if (!categoryId) {
                    result.failed.push({
                        data: categoryData,
                        error: 'Category missing categoryId field'
                    });
                    result.summary.failed++;
                    continue;
                }

                const existingCategory = await CategoryModel.findById(categoryId);

                if (existingCategory) {
                    result.skipped.push(existingCategory);
                    result.summary.skipped++;
                } else {
                    const newCategory = CategoryModel.buildCategoryData({
                        categoryId: categoryFields.categoryId,
                        name: categoryFields.name,
                        description: categoryFields.description || null,
                        color: categoryFields.color || null,
                        isDefault: categoryFields.isDefault || false,
                        tenantId: categoryFields.tenantId,
                        branchId: categoryFields.branchId,
                        terminalId: categoryFields.terminalId || null,
                        userId: categoryFields.userId
                    });
                    newCategory.synced = 1;

                    const savedCategory = await CategoryModel.create(newCategory);
                    result.saved.push(savedCategory);
                    result.summary.saved++;
                }
            } catch (error) {
                result.failed.push({
                    data: categoryData,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                result.summary.failed++;
            }
        }

        return result;
    }

    /**
     * @method  syncCustomers
     * @desc    Sync customers to local database using "exists skip" pattern
     * @param   customers - Array of customers from cloud (passed by client)
     * @returns Promise<SyncResult<Customer>> - Results of sync operation
     */
    static async syncCustomers(customers: Customer[]): Promise<SyncResult<Customer>> {
        const result: SyncResult<Customer> = {
            saved: [],
            skipped: [],
            failed: [],
            summary: { total: customers.length, saved: 0, skipped: 0, failed: 0 }
        };

        for (const customerData of customers) {
            try {
                // Remove relation objects that shouldn't be passed to Prisma
                const { branch, user, transactions, sales, ...customerFields } = customerData as any;

                const customerId = customerFields.customerId;

                if (!customerId) {
                    result.failed.push({
                        data: customerData,
                        error: 'Customer missing customerId field'
                    });
                    result.summary.failed++;
                    continue;
                }

                const existingCustomer = await CustomerModel.findById(customerId);

                if (existingCustomer) {
                    result.skipped.push(existingCustomer);
                    result.summary.skipped++;
                } else {
                    const savedCustomer = await CustomerModel.create({
                        customerId: customerFields.customerId,
                        name: customerFields.name,
                        tenantId: customerFields.tenantId,
                        branchId: customerFields.branchId,
                        userId: customerFields.userId,
                        phone: customerFields.phone || null,
                        email: customerFields.email || null,
                        address: customerFields.address || null,
                        isDefault: customerFields.isDefault || false,
                        synced: 1
                    });
                    result.saved.push(savedCustomer);
                    result.summary.saved++;
                }
            } catch (error) {
                result.failed.push({
                    data: customerData,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                result.summary.failed++;
            }
        }

        return result;
    }
}
