import { SubscriptionPlanModel } from '../../models/subscription-plan.model';
import { PaymentMethodModel } from '../../models/payment-methods.model';
import { PaymentServiceProviderModel } from '../../models/payment-service-provider.model';
import { CategoryModel } from '../../models/category.model';
import { CustomerModel } from '../../models/customer.model';
import type { SubscriptionPlan } from 'subscription';
import type { PaymentMethod } from 'payment-method';
import type { PaymentServiceProvider } from 'payment-service-provider';
import type { Category } from 'categoty';
import type { Customer } from 'customer';
import { ValidationParams } from 'on-boarding';

interface FetchParams {
    tenantId: string;
    branchId: string;
}

/**
 * Converts FetchParams to ValidationParams for model compatibility
 */
function toValidationParams(params: FetchParams): ValidationParams {
    return {
        terminalId: '',
        tenantId: params.tenantId,
        branchId: params.branchId,
        verificationKey: ''
    };
}

/**
 * @class   OnboardingFetchService
 * @desc    Handles fetching onboarding data from local database
 */
export class OnboardingFetchService {
    /**
     * @method  fetchSubscriptionPlans
     * @desc    Fetch subscription plans from local database
     * @param   params - FetchParams with tenantId, branchId
     * @returns Promise<SubscriptionPlan[]> - Array of subscription plans
     */
    static async fetchSubscriptionPlans(params: FetchParams): Promise<SubscriptionPlan[]> {
        return SubscriptionPlanModel.findAllByRDBMS(toValidationParams(params));
    }

    /**
     * @method  fetchPaymentMethods
     * @desc    Fetch payment methods from local database
     * @param   params - FetchParams with tenantId, branchId
     * @returns Promise<PaymentMethod[]> - Array of payment methods
     */
    static async fetchPaymentMethods(params: FetchParams): Promise<PaymentMethod[]> {
        return PaymentMethodModel.findAllByRDBMS(toValidationParams(params));
    }

    /**
     * @method  fetchPaymentServiceProviders
     * @desc    Fetch payment service providers from local database
     * @param   params - FetchParams with tenantId, branchId
     * @returns Promise<PaymentServiceProvider[]> - Array of payment service providers
     */
    static async fetchPaymentServiceProviders(params: FetchParams): Promise<PaymentServiceProvider[]> {
        return PaymentServiceProviderModel.findAllByRDBMS(toValidationParams(params));
    }

    /**
     * @method  fetchCategories
     * @desc    Fetch categories from local database
     * @param   params - FetchParams with tenantId, branchId
     * @returns Promise<Category[]> - Array of categories
     */
    static async fetchCategories(params: FetchParams): Promise<Category[]> {
        return CategoryModel.findAll({ tenantId: params.tenantId, branchId: params.branchId });
    }

    /**
     * @method  fetchCustomers
     * @desc    Fetch customers from local database
     * @param   params - FetchParams with tenantId, branchId
     * @returns Promise<Customer[]> - Array of customers
     */
    static async fetchCustomers(params: FetchParams): Promise<Customer[]> {
        return CustomerModel.findAllByRDBMS(toValidationParams(params)) as unknown as Promise<Customer[]>;
    }
}
