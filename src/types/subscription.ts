import { Tenant } from "tenant";

export interface SubscriptionResponse {
	data: Array<BranchSubscription>;
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

export interface BranchSubscription {
	branchSubscriptionId: string;
	subscriptionPlanId: string;
	status: 'active' | 'cancelled' | 'expired' | 'past_due';
	startsAt: string | Date;
	endsAt?: string | Date | null;
	autoRenew?: boolean;
	paymentMethod?: string | null;
	synced?: number;
	lastPaymentDate?: string | Date | null;
	nextPaymentDate?: string | Date | null;
	createdAt?: string | Date;
	updatedAt?: string | Date;
	subscriptionPlan?: SubscriptionPlan | null;
}

export interface CreateBranchSubscriptionRequest {
	subscriptionPlanId: string;
	autoRenew?: boolean;
}

// Alias for backward compatibility
export interface CreateSubscriptionRequest {
	subscriptionPlanId: string;
	subscriptionMonths?: number;
	autoRenew?: boolean;
	paymentMethod?: string;
}

export interface SubscriptionPlan {
	planId: string;
	subscriptionPlanId?: string;
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

export type TenantInfo = Pick<Tenant, 'tenantId' | 'businessName' | 'email' | 'phoneNumber' | 'address'>

export interface BranchSubscriptionInfo {
	branchId: string;
	branchName: string;
	branchSubscriptionId?: string | null;
}

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

export interface UpdateBranchSubscriptionRequest {
	status?: BranchSubscription['status'];
	endsAt?: string;
	autoRenew?: boolean;
	paymentMethod?: string;
	nextPaymentDate?: string;
}

export interface BulkUpdateRequest {
	ids: string[];
	data: Partial<BranchSubscription>;
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

