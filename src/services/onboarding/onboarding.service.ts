import { TenantModel } from '../../models/tenant.model';
import { BranchModel } from '../../models/branch.model';
import { TerminalModel } from '../../models/terminal.model';
import { SubscriptionPlanModel } from '../../models/subscription-plan.model';
import { BranchSubscriptionModel } from '../../models/branch-subscription.model';
import { TenantCreateInput, BranchSubscriptionUncheckedCreateInput, SubscriptionPlanCreateInput, BranchUncheckedCreateInput } from '../../databases/prisma/generated/prisma/models';
import type { Tenant } from 'tenant';
import type { Branch } from 'branch';
import type { Terminal, TerminalWithRelations, BranchWithSubscription } from 'terminal';
import type { SubscriptionPlan, BranchSubscription } from 'subscription';

export { OnboardingFetchService } from './onboarding-fetch.service';
export { OnboardingSyncService } from './onboarding-sync.service';


interface SaveResult {
    tenant: { saved: boolean; exists: boolean; data?: Tenant };
    subscriptionPlan: { saved: boolean; exists: boolean; data?: SubscriptionPlan };
    branchSubscription: { saved: boolean; exists: boolean; data?: BranchSubscription };
    branch: { saved: boolean; exists: boolean; data?: Branch };
    terminal: { saved: boolean; exists: boolean; data?: Terminal };
}

/**
 * @class   OnboardingService
 * @desc    Business logic layer for terminal onboarding operations
 */
export class OnboardingService {
    /**
     * @method  saveTerminalDetails
     * @desc    Save terminal details with "exists skip" pattern
     *          Saves tenant, subscription plan, branch subscription, branch, and terminal
     * @param   data - Terminal activation data with nested tenant, branch, and subscription info
     * @returns Promise<SaveResult> - Results of save operations for each entity
     * @throws  Error - Failed to save terminal details
     */
    static async saveTerminalDetails(data: TerminalWithRelations): Promise<SaveResult> {
        const result: SaveResult = {
            tenant: { saved: false, exists: false },
            subscriptionPlan: { saved: false, exists: false },
            branchSubscription: { saved: false, exists: false },
            branch: { saved: false, exists: false },
            terminal: { saved: false, exists: false }
        };

        try {
            result.tenant = await this.saveTenant(data.tenant);
            const subscriptionPlanData = data.branch?.branchSubscription?.subscriptionPlan as unknown as SubscriptionPlanCreateInput;

            if (subscriptionPlanData) {
                result.subscriptionPlan = await this.saveSubscriptionPlan(subscriptionPlanData);
            }

            const branchSubscriptionData = data.branch?.branchSubscription as unknown as BranchSubscription;
            if (branchSubscriptionData) {
                result.branchSubscription = await this.saveBranchSubscription(branchSubscriptionData);
            }

            result.branch = await this.saveBranch(data.branch);
            result.terminal = await this.saveTerminal(data);

            return result;
        } catch (error) {
            throw new Error(`Failed to save terminal details: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @method  saveTenant
     * @desc    Save tenant using TenantModel (skip if exists)
     * @param   tenantData - Tenant data to save
     * @returns Promise<object> - Save result with exists/saved flags
     */
    private static async saveTenant(tenantData: Tenant): Promise<{ saved: boolean; exists: boolean; data?: Tenant }> {
        const existingTenant = await TenantModel.findById(tenantData.tenantId);

        if (existingTenant) {
            return { saved: false, exists: true, data: existingTenant };
        }

        const tenant = await TenantModel.create({
            tenantId: tenantData.tenantId,
            businessName: tenantData.businessName,
            tin: tenantData.tin,
            tenantCode: tenantData.tenantCode,
            businessType: tenantData.businessType,
            phoneNumber: tenantData.phoneNumber,
            email: tenantData.email,
            mraPortalUsername: tenantData.mraPortalUsername || null,
            tradingName: tenantData.tradingName || null,
            isVatRegistered: tenantData.isVatRegistered || false,
            taxOfficeCode: tenantData.taxOfficeCode || null,
            msonkhoOnlineStatus: tenantData.msonkhoOnlineStatus || 'PENDING',
            verificationToken: tenantData.verificationToken || 'offline',
            ownerName: tenantData.ownerName,
            address: tenantData.address || null,
            country: tenantData.country || null,
            status: tenantData.status || 'pending'
        } as TenantCreateInput);

        return { saved: true, exists: false, data: tenant };
    }

    /**
     * @method  saveSubscriptionPlan
     * @desc    Save subscription plan using SubscriptionPlanModel (skip if exists)
     * @param   planData - Subscription plan data to save
     * @returns Promise<object> - Save result with exists/saved flags
     */
    private static async saveSubscriptionPlan(planData: SubscriptionPlanCreateInput): Promise<{ saved: boolean; exists: boolean; data?: SubscriptionPlan }> {
        const existingPlan = await SubscriptionPlanModel.findById(planData.subscriptionPlanId);

        if (existingPlan) {
            return { saved: false, exists: true, data: existingPlan };
        }

        const plan = await SubscriptionPlanModel.create({
            subscriptionPlanId: planData.subscriptionPlanId,
            planCode: planData.planCode,
            name: planData.name,
            description: planData.description || null,
            monthlyPrice: planData.monthlyPrice ? parseFloat(String(planData.monthlyPrice)) : 0,
            yearlyPrice: planData.yearlyPrice ? parseFloat(String(planData.yearlyPrice)) : 0,
            color: planData.color || null,
            isPopular: planData.isPopular || false,
            isActive: planData.isActive !== undefined ? planData.isActive : true,
            features: planData.features || [],
            limits: planData.limits || {},
            notes: planData.notes || null,
        });

        return { saved: true, exists: false, data: plan };
    }

    /**
     * @method  saveBranchSubscription
     * @desc    Save branch subscription using BranchSubscriptionModel (skip if exists)
     * @param   subscriptionData - Branch subscription data to save
     * @returns Promise<object> - Save result with exists/saved flags
     */
    private static async saveBranchSubscription(subscriptionData: BranchSubscription): Promise<{ saved: boolean; exists: boolean; data?: BranchSubscription }> {
        const existingSubscription = await BranchSubscriptionModel.findById(subscriptionData.branchSubscriptionId);

        if (existingSubscription) {
            return { saved: false, exists: true, data: existingSubscription };
        }

        const subscription = await BranchSubscriptionModel.create({
            branchSubscriptionId: subscriptionData.branchSubscriptionId,
            subscriptionPlanId: subscriptionData.subscriptionPlanId,
            status: subscriptionData.status || 'active',
            startsAt: subscriptionData.startsAt ? new Date(subscriptionData.startsAt) : new Date(),
            endsAt: subscriptionData.endsAt ? new Date(subscriptionData.endsAt) : null,
            autoRenew: subscriptionData.autoRenew || false,
            paymentMethod: subscriptionData.paymentMethod || null,
            lastPaymentDate: subscriptionData.lastPaymentDate ? new Date(subscriptionData.lastPaymentDate) : null,
            nextPaymentDate: subscriptionData.nextPaymentDate ? new Date(subscriptionData.nextPaymentDate) : null
        } as BranchSubscriptionUncheckedCreateInput);

        return { saved: true, exists: false, data: subscription };
    }

    /**
     * @method  saveBranch
     * @desc    Save branch using BranchModel (skip if exists)
     * @param   branchData - Branch data to save
     * @returns Promise<object> - Save result with exists/saved flags
     */
    private static async saveBranch(branchData: BranchWithSubscription): Promise<{ saved: boolean; exists: boolean; data?: Branch }> {
        const existingBranch = await BranchModel.findById(branchData.branchId);

        if (existingBranch) {
            return { saved: false, exists: true, data: existingBranch };
        }

        const branch = await BranchModel.create({
            branchId: branchData.branchId,
            tenantId: branchData.tenantId,
            branchName: branchData.branchName,
            branchCode: branchData.branchCode,
            siteId: branchData.siteId || null,
            siteName: branchData.siteName || null,
            description: branchData.description || null,
            addressLine1: branchData.addressLine1 || null,
            addressLine2: branchData.addressLine2 || null,
            addressLine3: branchData.addressLine3 || null,
            districtId: branchData.districtId || null,
            location: branchData.location || null,
            businessType: branchData.businessType || 'PRODUCT_BASED',
            city: branchData.city || null,
            state: branchData.state || null,
            postalCode: branchData.postalCode || null,
            phoneNumber: branchData.phoneNumber || null,
            email: branchData.email || null,
            currencyCode: branchData.currencyCode || 'MWK',
            currencySymbol: branchData.currencySymbol || 'K',
            taxRate: branchData.taxRate ? parseFloat(branchData.taxRate) : 0,
            chargeTax: branchData.chargeTax || false,
            receiptFooter: branchData.receiptFooter || null,
            logoUrl: branchData.logoUrl || null,
            isVirtualWarehouse: branchData.isVirtualWarehouse || false,
            isActive: branchData.isActive !== undefined ? branchData.isActive : true,
            mraApprovalStatus: branchData.mraApprovalStatus || 'PENDING',
            branchSubscriptionId: branchData.branchSubscriptionId || null,
            status: branchData.status || 'active'
        } as BranchUncheckedCreateInput);

        return { saved: true, exists: false, data: branch };
    }

    /**
     * @method  saveTerminal
     * @desc    Save terminal using TerminalModel (skip if exists)
     * @param   terminalData - Terminal data to save
     * @returns Promise<object> - Save result with exists/saved flags
     */
    private static async saveTerminal(terminalData: TerminalWithRelations): Promise<{ saved: boolean; exists: boolean; data?: Terminal }> {
        const existingTerminal = await TerminalModel.findById(terminalData.terminalId);

        if (existingTerminal) {
            return { saved: false, exists: true, data: existingTerminal };
        }

        const terminal = await TerminalModel.create({
            terminalId: terminalData.terminalId,
            tenantId: terminalData.tenantId,
            branchId: terminalData.branchId,
            terminalCode: terminalData.terminalCode,
            terminalLabel: terminalData.terminalLabel,
            terminalPosition: terminalData.terminalPosition || null,
            deviceId: terminalData.deviceId || null,
            osName: terminalData.osName || null,
            osVersion: terminalData.osVersion || null,
            osBuild: terminalData.osBuild || null,
            macAddress: terminalData.macAddress || null,
            activationCode: terminalData.activationCode || null,
            isPrimary: terminalData.isPrimary || false
        });

        return { saved: true, exists: false, data: terminal };
    }
}
