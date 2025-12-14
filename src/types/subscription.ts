import { Tenant } from "tenant";

export interface SubscriptionResponse {
	data: Array<TenantSubscription>;
	message: string;
	success: boolean;
}

export interface PlanFeatureCategory {
	featureCategoryId?: number;
	title: string;
	features: string[];
	displayOrder?: number;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface TenantSubscription {
	subscriptionId: string;
	tenantId: string;
	tenantDetails?: {
		tenantCode: string;
		companyName: string;
		ownerName: string;
	};
	planId: string;
	planName: string;
	billingCycle: string;
	referenceNumber: string;
	status: 'active' | 'cancelled' | 'expired' | 'past_due';
	startsAt: string;
	endsAt?: string;
	autoRenew?: boolean;
	maxBranches: number;
	paymentMethod?: string;
	lastPaymentDate?: string;
	nextPaymentDate?: string;
	createdAt?: string;
	updatedAt?: string;
	synced?: 0 | 1;
}

export interface CreateSubscriptionRequest {
	tenantId: string;
	planId: string;
	planName: string;
	referenceNumber: string;
	autoRenew?: boolean;
	billingCycle: 'monthly' | 'yearly'
}

export interface SubscriptionPlan {
	planId: string;
	name: string;
	displayName: string;
	description: string;
	monthlyPrice: number;
	yearlyPrice: number;
	maxBranches: number;
	color: 'blue' | 'green' | 'purple' | 'gray';
	popular?: boolean;
	features: PlanFeature[];
	limits: PlanLimits;
	notes?: string;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export type TenantInfo = Pick<Tenant, 'tenantId' | 'businessName' | 'email' | 'phoneNumber' | 'address' | 'subscriptionPlan'>

export interface PaymentInfo {
	referenceNumber: string;
	paymentMethodId: string;
}

export interface CreateSubscriptionPlanRequest {
	name: string;
	description?: string;
	price: number;
	billingCycle: 'monthly' | 'yearly' | 'lifetime';
	features: PlanFeature[];
	isActive?: boolean;
}

export interface UpdateSubscriptionRequest {
	status?: TenantSubscription['status'];
	endsAt?: string;
	autoRenew?: boolean;
	paymentMethod?: string;
	nextPaymentDate?: string;
}

export interface BulkUpdateRequest {
	ids: string[];
	data: Partial<TenantSubscription>;
}

export interface ProcessPaymentRequest {
	amount: number;
	paymentMethod: string;
}

export interface SubscriptionStats {
	total: number;
	active: number;
	cancelled: number;
	expired: number;
	pastDue: number;
	monthlyRevenue: number;
	annualRevenue: number;
}

export interface PlanFeature {
	name: string;
	included: boolean;
	tooltip?: string;
}

export interface PlanLimits {
	terminals: number;
	users: number;
	products: number;
	storage: string;
}

