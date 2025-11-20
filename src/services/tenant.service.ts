import { EmailService } from "./email.service";
import { BranchModel } from "../models/branch.model";
import { TenantModel } from "../models/tenant.model";
import { SubscriptionModel } from "../models/subscription.model";
import { TerminalModel } from "../models/terminal.model";
import { BranchService } from "./branch.service";
import { TerminalService } from "./terminal.service";
import { SecureSettingsService } from "./secure-settings.service";
import { v4 as uuidv4 } from 'uuid';
import { MsonkhoOnlineStatus, Tenant, TenantFormValues, TenantStatus } from "tenant";
import { OnboardingStatus } from "on-boarding";

export class TenantService {
    static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateTin(tin: string): boolean {
        return tin && tin.length > 0;
    }

    static validateRequired(fields: Record<string, any>, requiredFields: string[]): string | null {
        for (const field of requiredFields) {
            if (!fields[field]) {
                return `Missing required field: ${field}`;
            }
        }
        return null;
    }

    static async registerTenant(data: TenantFormValues): Promise<Tenant> {
        const validationError = this.validateRequired(data, [
            'businessName',
            'tin',
            'businessType',
            'ownerName',
            'phoneNumber',
            'email'
        ]);

        if (validationError) {
            throw new Error(validationError);
        }

        if (!this.validateEmail(data.email)) {
            throw new Error('Invalid email format');
        }

        if (!this.validateTin(data.tin)) {
            throw new Error('Invalid TIN format');
        }

        const existingTenantByEmail = await TenantModel.findByEmail(data.email);
        if (existingTenantByEmail.length > 0) {
            throw new Error('Tenant with this email already exists');
        }

        const existingTenantByTin = await TenantModel.findByTin(data.tin);
        if (existingTenantByTin.length > 0) {
            throw new Error('Tenant with this TIN already exists');
        }

        const tenant = await TenantModel.create(data);
        const verificationToken = await SecureSettingsService.encryptTenantId(tenant.tenantId)

        const defaultBranch = await BranchService.createDefault({
            tenantId: tenant.tenantId,
            branchId: uuidv4()
        })
        const defaultTerminal = await TerminalService.createDefault({
            tenantId: tenant.tenantId,
            branchId: defaultBranch.branchId,
            terminalId: uuidv4(),
        })

        if (defaultTerminal) {
            try {
                await EmailService.sendWelcomeEmail({
                    businessName: tenant.businessName,
                    ownerName: tenant.ownerName,
                    email: tenant.email,
                    tenantCode: tenant.tenantCode,
                    verificationToken,
                });

                console.log(`Welcome email sent successfully to ${tenant.email} for business: ${tenant.businessName}`);

            } catch (emailError) {
                console.error('Failed to send welcome email:', {
                    tenantCode: tenant.tenantCode,
                    email: tenant.email,
                    error: emailError instanceof Error ? emailError.message : 'Unknown error'
                });

                if (tenant.tenantId) {
                    await TenantModel.update(tenant.tenantId, { synced: false });
                }
            }
        }

        return tenant;
    }

    static async getAllTenants(query: any = {}): Promise<Omit<Tenant, 'verificationToken'>[]> {
        try {
            const tenants = await TenantModel.findAll(query);
            return tenants.map(tenant => TenantModel.sanitizeTenant(tenant));
        } catch (error) {
            throw new Error(`Failed to retrieve tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async getTenantById(tenantId: string): Promise<Omit<Tenant, 'verificationToken'>> {
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        return TenantModel.sanitizeTenant(tenant);
    }

    static async getTenantByCode(tenantCode: string): Promise<Omit<Tenant, 'verificationToken'>> {
        const tenant = await TenantModel.findByTenantCode(tenantCode);
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        return TenantModel.sanitizeTenant(tenant);
    }

    static async deleteTenant(tenantId: string): Promise<{ status: boolean }> {
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const subscriptions = await SubscriptionModel.findByTenantId(tenantId);
        const shops = await BranchModel.findByTenantId(tenantId);
        const workstations = await TerminalModel.findByTenantId(tenantId);

        if (subscriptions.length > 0 || shops.length > 0 || workstations.length > 0) {
            throw new Error('Cannot delete tenant with existing subscriptions, shops, or workstations');
        }

        const deletedCount = await TenantModel.delete(tenantId);
        if (deletedCount === 0) {
            throw new Error('Failed to delete tenant');
        }

        return { status: true };
    }

    static async verifyTenant(tenantId: string): Promise<Omit<Tenant, 'verificationToken'>> {
        const tenant = await TenantModel.findById(tenantId);

        if (!tenant) {
            throw new Error('Invalid tenant credentials');
        }

        await TenantModel.update(tenantId, {
            status: 'active',
            activatedAt: new Date()
        })

        const updatedTenant = {
            ...tenant,
            status: 'active' as TenantStatus,
            activatedAt: new Date()
        };

        return TenantModel.sanitizeTenant(updatedTenant);
    }

    static async updateTenant(tenantId: string, updateData: Partial<TenantFormValues>): Promise<Omit<Tenant, 'verificationToken'>> {
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        if (updateData.email && updateData.email !== tenant.email) {
            const existingTenants = await TenantModel.findByEmail(updateData.email);
            if (existingTenants.length > 0) {
                throw new Error('Email already exists');
            }
        }

        if (updateData.tin && updateData.tin !== tenant.tin) {
            const existingTenants = await TenantModel.findByTin(updateData.tin);
            if (existingTenants.length > 0) {
                throw new Error('TIN already exists');
            }
        }

        const numUpdated = await TenantModel.update(tenantId, updateData as Partial<any>);
        if (numUpdated === 0) {
            throw new Error('Failed to update tenant');
        }

        const updatedTenant = await TenantModel.findById(tenantId);
        if (!updatedTenant) {
            throw new Error('Failed to retrieve updated tenant data');
        }

        return TenantModel.sanitizeTenant(updatedTenant);
    }

    static async getOnboardingStatus(tenantId: string): Promise<OnboardingStatus> {
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const subscriptions = await SubscriptionModel.findByTenantId(tenantId);
        const activeSubscription = subscriptions.find(sub => sub.status === 'active') || null;

        const shops = await BranchModel.findByTenantId(tenantId);
        const workstations = await TerminalModel.findByTenantId(tenantId);

        const onboardingSteps = {
            tenantRegistered: true,
            subscriptionActive: !!activeSubscription,
            shopCreated: shops.length > 0,
            workstationSetup: workstations.length > 0
        };

        const completedSteps = Object.values(onboardingSteps).filter(Boolean).length;
        const totalSteps = Object.keys(onboardingSteps).length;
        const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

        const safeTenant = TenantModel.sanitizeTenant(tenant);

        return {
            tenant: safeTenant,
            subscription: activeSubscription,
            shops,
            workstations,
            onboarding: {
                steps: onboardingSteps,
                completedSteps: completedSteps,
                totalSteps: totalSteps,
                completionPercentage: completionPercentage,
                isComplete: completionPercentage === 100
            }
        };
    }

    static async resendWelcomeEmail(tenantId: string): Promise<boolean> {
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        try {
            await EmailService.sendWelcomeEmail({
                businessName: tenant.businessName,
                ownerName: tenant.ownerName,
                email: tenant.email,
                tenantCode: tenant.tenantCode,
                verificationToken: tenant.verificationToken,
            });

            console.log(`Welcome email resent successfully to ${tenant.email}`);
            return true;
        } catch (error) {
            console.error('Failed to resend welcome email:', error);
            throw new Error(`Failed to resend welcome email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async sendCustomEmail(tenantId: string, subject: string, message: string): Promise<boolean> {
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        try {
            await EmailService.sendEmail(tenant.email, subject, message);
            return true;
        } catch (error) {
            throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updateMsonkhoStatus(tenantId: string, status: MsonkhoOnlineStatus): Promise<Omit<Tenant, 'verificationToken'>> {
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const numUpdated = await TenantModel.update(tenantId, { msonkhoOnlineStatus: status });
        if (numUpdated === 0) {
            throw new Error('Failed to update Msonkho status');
        }

        const updatedTenant = await TenantModel.findById(tenantId);
        if (!updatedTenant) {
            throw new Error('Failed to retrieve updated tenant');
        }

        return TenantModel.sanitizeTenant(updatedTenant);
    }
}