import { EmailService } from "./email.service";
import { BranchModel } from "../models/branch.model";
import { TenantModel } from "../models/tenant.model";
import { SubscriptionModel } from "../models/subscription.model";
import { SubscriptionPlanModel } from "../models/subscription-plan.model";
import { TerminalModel } from "../models/terminal.model";
import { UserModel } from "../models/user.model";
import { BranchService } from "./branch.service";
import { TerminalService } from "./terminal.service";
import { SecureSettingsService } from "./secure-settings.service";
import { v4 as uuidv4 } from 'uuid';
import { MsonkhoOnlineStatus, Tenant, TenantFormValues, TenantStatus } from "tenant";
import { OnboardingStatus } from "on-boarding";
import { BaseService } from "./base.service";
import { TenantCreateInput } from "../databases/prisma/generated/prisma/models";

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

        const tenant = await TenantModel.create(data as unknown as TenantCreateInput);
        const verificationToken = await SecureSettingsService.encryptTenantId(tenant.tenantId)

        if (data.subscriptionPlan) {
            const subscriptionPlan = await SubscriptionPlanModel.findById(data.subscriptionPlan);
            if (subscriptionPlan) {
                const now = new Date();
                const endsAt = new Date();
                endsAt.setMonth(endsAt.getMonth() + 1);

                const subscriptionData = {
                    tenantSubscriptionId: uuidv4(),
                    tenantId: tenant.tenantId,
                    subscriptionPlanId: (subscriptionPlan as any).subscriptionPlanId,
                    status: 'active',
                    startsAt: now,
                    endsAt: endsAt,
                    autoRenew: true,
                    maxBranches: 1,
                    synced: 0,
                    createdAt: now,
                    updatedAt: now
                };

                await SubscriptionModel.create(subscriptionData as any);
            }
        }

        const defaultBranch = await BranchService.createDefault({
            tenantId: tenant.tenantId,
            branchId: uuidv4()
        })
        const defaultTerminal = await TerminalService.createDefault({
            tenantId: tenant.tenantId,
            branchId: defaultBranch.branchId,
            terminalId: uuidv4(),
        })

        const defaultUsername = data.email.split('@')[0];
        const defaultPassword = tenant.tenantCode;

        await UserModel.create({
            userId: uuidv4(),
            tenantId: tenant.tenantId,
            branchId: defaultBranch.branchId,
            username: defaultUsername,
            password: defaultPassword,
            fullname: tenant.ownerName,
            email: tenant.email,
            phone: tenant.phoneNumber,
            roleId: 'admin',
            status: 'active',
            accessibleBranches: ['*'],
            allowedTerminals: ['*'],
        });

        if (defaultTerminal) {
            try {
                // await EmailService.sendWelcomeEmail({
                //     businessName: tenant.businessName,
                //     ownerName: tenant.ownerName,
                //     email: tenant.email,
                //     tenantCode: tenant.tenantCode,
                //     verificationToken,
                //     username: defaultUsername,
                //     password: defaultPassword,
                // });
                console.log({
                    businessName: tenant.businessName,
                    ownerName: tenant.ownerName,
                    email: tenant.email,
                    tenantCode: tenant.tenantCode,
                    verificationToken,
                    username: defaultUsername,
                    password: defaultPassword,
                })
            } catch (emailError) {
                console.error('Failed to send welcome email:', {
                    tenantCode: tenant.tenantCode,
                    email: tenant.email,
                    error: emailError instanceof Error ? emailError.message : 'Unknown error'
                });

                if (tenant.tenantId) {
                    await TenantModel.update(tenant.tenantId, { synced: 0 });
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
        const branches = await BranchModel.findByTenantId(tenantId);
        const terminals = await TerminalModel.findByTenantId(tenantId);

        if (subscriptions.length > 0 || branches.length > 0 || terminals.length > 0) {
            throw new Error('Cannot delete tenant with existing subscriptions, branches, or terminals');
        }

        const isDeleted = await TenantModel.delete(tenantId);
        if (isDeleted) {
            throw new Error('Failed to delete tenant');
        }

        return { status: true };
    }

    static async verifyTenant(verificationToken: string): Promise<Omit<Tenant, 'verificationToken'>> {
        const response = await BaseService.post<TenantFormValues>('/on-boarding/live/verify-account', {
            verificationToken,
        });

        if (!response.success) {
            throw new Error(response.message || 'Failed to verify tenant');
        }

        const tenant = response.data;

        const tenantExists = await TenantModel.exists(tenant.tenantId)

        if (tenantExists)
            return TenantModel.sanitizeTenant(tenant as unknown as Tenant);

        const localTenant = await TenantModel.insert(tenant as undefined);

        if (!localTenant) {
            throw new Error('Something went wrong. External server down');
        }

        return TenantModel.sanitizeTenant(localTenant);
    }

    static async verifyTenantAccount(verificationToken: string): Promise<Omit<Tenant, 'verificationToken'>> {
        const { tenantId } = await SecureSettingsService.decryptTenantId(verificationToken);

        const tenant = await TenantModel.findById(tenantId);

        if (!tenant) {
            throw new Error('Invalid tenant credentials');
        }

        const now = new Date();
        await TenantModel.update(tenantId, {
            status: 'active',
            activatedAt: now
        });

        const updatedTenant = {
            ...tenant,
            status: 'active' as TenantStatus,
            activatedAt: now
        };

        return updatedTenant;
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
        if (numUpdated) {
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

        const branches = await BranchModel.findByTenantId(tenantId);
        const terminals = await TerminalModel.findByTenantId(tenantId);

        const onboardingSteps = {
            tenantRegistered: true,
            subscriptionActive: !!activeSubscription,
            branchCreated: branches.length > 0,
            terminalSetup: terminals.length > 0
        };

        const completedSteps = Object.values(onboardingSteps).filter(Boolean).length;
        const totalSteps = Object.keys(onboardingSteps).length;
        const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

        const safeTenant = TenantModel.sanitizeTenant(tenant);

        return {
            tenant: safeTenant,
            subscription: activeSubscription,
            branches,
            terminals,
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

        const isUpdated = await TenantModel.update(tenantId, { msonkhoOnlineStatus: status });
        if (isUpdated) {
            throw new Error('Failed to update Msonkho status');
        }

        const updatedTenant = await TenantModel.findById(tenantId);
        if (!updatedTenant) {
            throw new Error('Failed to retrieve updated tenant');
        }

        return TenantModel.sanitizeTenant(updatedTenant);
    }
}