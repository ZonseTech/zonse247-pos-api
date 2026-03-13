/**
 * Onboarding Service
 * Core business logic for terminal onboarding operations
 * Handles saving terminal details with "exists skip" pattern
 */

import { TenantModel } from '../../models/tenant.model';
import { BranchModel } from '../../models/branch.model';
import { TerminalModel } from '../../models/terminal.model';
import { SubscriptionPlanModel } from '../../models/subscription-plan.model';
import { BranchSubscriptionModel } from '../../models/branch-subscription.model';
import {
    TenantCreateInput,
    BranchSubscriptionUncheckedCreateInput,
    SubscriptionPlanCreateInput,
    BranchUncheckedCreateInput
} from '../../databases/prisma/generated/prisma/models';
import type { Tenant } from 'tenant';
import type { Branch } from 'branch';
import type { Terminal, TerminalWithRelations, BranchWithSubscription } from 'terminal';
import type { SubscriptionPlan, BranchSubscription } from 'subscription';
import { TerminalSaveResult, EntitySaveResult } from './types';
import { parseNumeric, parseBoolean } from './base-sync.service';
import { DEFAULTS } from './constants';
import { getErrorMessage } from './errors';

// Re-export sub-services for backward compatibility
export { OnboardingFetchService } from './onboarding-fetch.service';
export { OnboardingSyncService } from './onboarding-sync.service';
export { InitialSyncService, INITIAL_SYNC_TABLES, STEP_TO_TABLES_MAP } from './initial-sync.service';
export { MasterDataFetchService } from './master-data-fetch.service';

/**
 * @class   OnboardingService
 * @desc    Business logic layer for terminal onboarding operations
 */
export class OnboardingService {
    /**
     * Save terminal details with "exists skip" pattern
     * Saves tenant, subscription plan, branch subscription, branch, and terminal
     * 
     * @param data - Terminal activation data with nested tenant, branch, and subscription info
     * @returns Results of save operations for each entity
     * @throws Error if save operations fail
     */
    static async saveTerminalDetails(data: TerminalWithRelations): Promise<TerminalSaveResult> {
        const result: TerminalSaveResult = {
            tenant: { saved: false, exists: false },
            subscriptionPlan: { saved: false, exists: false },
            branchSubscription: { saved: false, exists: false },
            branch: { saved: false, exists: false },
            terminal: { saved: false, exists: false }
        };

        try {
            // Save in order of dependencies
            result.tenant = await this.saveTenant(data.tenant);

            // Save subscription plan if available
            const subscriptionPlanData = data.branch?.branchSubscription?.subscriptionPlan as unknown as SubscriptionPlanCreateInput;
            if (subscriptionPlanData) {
                result.subscriptionPlan = await this.saveSubscriptionPlan(subscriptionPlanData);
            }

            // Save branch subscription if available
            const branchSubscriptionData = data.branch?.branchSubscription as unknown as BranchSubscription;
            if (branchSubscriptionData) {
                result.branchSubscription = await this.saveBranchSubscription(branchSubscriptionData);
            }

            result.branch = await this.saveBranch(data.branch);
            result.terminal = await this.saveTerminal(data);

            return result;
        } catch (error) {
            throw new Error(`Failed to save terminal details: ${getErrorMessage(error)}`);
        }
    }

    /**
     * Save tenant using TenantModel (skip if exists)
     */
    private static async saveTenant(tenantData: Tenant): Promise<EntitySaveResult<Tenant>> {
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
            isVatRegistered: parseBoolean(tenantData.isVatRegistered),
            // MRA compliance fields
            isMraEnabled: parseBoolean((tenantData as any).isMraEnabled),
            mraEnvironment: (tenantData as any).mraEnvironment || 'SANDBOX',
            taxOfficeCode: tenantData.taxOfficeCode || null,
            msonkhoOnlineStatus: tenantData.msonkhoOnlineStatus || DEFAULTS.MSONKHO_STATUS,
            verificationToken: tenantData.verificationToken || DEFAULTS.VERIFICATION_TOKEN,
            ownerName: tenantData.ownerName,
            address: tenantData.address || null,
            country: tenantData.country || null,
            status: tenantData.status || 'pending'
        } as TenantCreateInput);

        return { saved: true, exists: false, data: tenant };
    }

    /**
     * Save subscription plan using SubscriptionPlanModel (skip if exists)
     */
    private static async saveSubscriptionPlan(planData: SubscriptionPlanCreateInput): Promise<EntitySaveResult<SubscriptionPlan>> {
        const existingPlan = await SubscriptionPlanModel.findById(planData.subscriptionPlanId);

        if (existingPlan) {
            return { saved: false, exists: true, data: existingPlan };
        }

        const plan = await SubscriptionPlanModel.create({
            subscriptionPlanId: planData.subscriptionPlanId,
            planCode: planData.planCode,
            name: planData.name,
            description: planData.description || null,
            monthlyPrice: parseNumeric(planData.monthlyPrice),
            yearlyPrice: parseNumeric(planData.yearlyPrice),
            color: planData.color || null,
            isPopular: parseBoolean(planData.isPopular),
            isActive: planData.isActive !== undefined ? planData.isActive : true,
            features: planData.features || [],
            limits: planData.limits || {},
            notes: planData.notes || null,
        });

        return { saved: true, exists: false, data: plan };
    }

    /**
     * Save branch subscription using BranchSubscriptionModel (skip if exists)
     */
    private static async saveBranchSubscription(subscriptionData: BranchSubscription): Promise<EntitySaveResult<BranchSubscription>> {
        const existingSubscription = await BranchSubscriptionModel.findById(subscriptionData.branchSubscriptionId);

        if (existingSubscription) {
            return { saved: false, exists: true, data: existingSubscription };
        }

        const subscription = await BranchSubscriptionModel.create({
            branchSubscriptionId: subscriptionData.branchSubscriptionId,
            subscriptionPlanId: subscriptionData.subscriptionPlanId,
            status: subscriptionData.status || DEFAULTS.STATUS,
            startsAt: subscriptionData.startsAt ? new Date(subscriptionData.startsAt) : new Date(),
            endsAt: subscriptionData.endsAt ? new Date(subscriptionData.endsAt) : null,
            autoRenew: parseBoolean(subscriptionData.autoRenew),
            paymentMethod: subscriptionData.paymentMethod || null,
            lastPaymentDate: subscriptionData.lastPaymentDate ? new Date(subscriptionData.lastPaymentDate) : null,
            nextPaymentDate: subscriptionData.nextPaymentDate ? new Date(subscriptionData.nextPaymentDate) : null
        } as BranchSubscriptionUncheckedCreateInput);

        return { saved: true, exists: false, data: subscription };
    }

    /**
     * Save branch using BranchModel (skip if exists)
     */
    private static async saveBranch(branchData: BranchWithSubscription): Promise<EntitySaveResult<Branch>> {
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
            businessType: branchData.businessType || DEFAULTS.BUSINESS_TYPE,
            city: branchData.city || null,
            state: branchData.state || null,
            postalCode: branchData.postalCode || null,
            phoneNumber: branchData.phoneNumber || null,
            email: branchData.email || null,
            currencyCode: branchData.currencyCode || DEFAULTS.CURRENCY_CODE,
            currencySymbol: branchData.currencySymbol || DEFAULTS.CURRENCY_SYMBOL,
            taxRate: branchData.taxRate ? parseNumeric(branchData.taxRate) : 0,
            chargeTax: parseBoolean(branchData.chargeTax),
            receiptFooter: branchData.receiptFooter || null,
            logoUrl: branchData.logoUrl || null,
            isVirtualWarehouse: parseBoolean(branchData.isVirtualWarehouse),
            isActive: branchData.isActive !== undefined ? branchData.isActive : true,
            mraApprovalStatus: branchData.mraApprovalStatus || DEFAULTS.MRA_STATUS,
            branchSubscriptionId: branchData.branchSubscriptionId || null,
            status: branchData.status || DEFAULTS.STATUS
        } as BranchUncheckedCreateInput);

        return { saved: true, exists: false, data: branch };
    }

    /**
     * Save terminal using TerminalModel (skip if exists)
     */
    private static async saveTerminal(terminalData: TerminalWithRelations): Promise<EntitySaveResult<Terminal>> {
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
            isPrimary: parseBoolean(terminalData.isPrimary)
        });

        return { saved: true, exists: false, data: terminal };
    }
}
