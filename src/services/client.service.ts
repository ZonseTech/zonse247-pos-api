import { EmailService } from "./email.service";
import { ShopModel } from "../models/shop.model";
import { ClientModel } from "../models/client.model";
import { SubscriptionModel } from "../models/subscription.model";
import { WorkstationModel } from "../models/work-station.model";

export class ClientService {
    static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateRequired(fields: Record<string, any>, requiredFields: string[]): string | null {
        for (const field of requiredFields) {
            if (!fields[field]) {
                return `Missing required field: ${field}`;
            }
        }
        return null;
    }

    static async registerClient(data: RegisterClientRequest): Promise<Client> {
        const validationError = this.validateRequired(data, ['companyName', 'ownerName', 'email', 'phone']);
        if (validationError) {
            throw new Error(validationError);
        }

        if (!this.validateEmail(data.email)) {
            throw new Error('Invalid email format');
        }

        const existingClients = await ClientModel.findByEmail(data.email);
        if (existingClients.length > 0) {
            throw new Error('Client with this email already exists');
        }

        const clientData = ClientModel.buildClientData(data);
        const client = await ClientModel.create(clientData);

        if (client) {
            try {
                await EmailService.sendWelcomeEmail({
                    companyName: client.companyName,
                    ownerName: client.ownerName,
                    email: client.email,
                    clientUuid: client.uuid,
                    authKey: client.authKey,
                });

                console.log(`Welcome email sent successfully to ${client.email} for company: ${client.companyName}`);

            } catch (emailError) {
                console.error('Failed to send welcome email:', {
                    clientUuid: client.uuid,
                    email: client.email,
                    error: emailError instanceof Error ? emailError.message : 'Unknown error'
                });

                await ClientModel.update(client.uuid, { emailSent: false });
            }
        }

        return client;
    }

    static async getAllClients(query: any = {}): Promise<Omit<Client, 'authKey'>[]> {
        try {
            const clients = await ClientModel.findAll(query);
            return clients.map(client => ClientModel.sanitizeClient(client));
        } catch (error) {
            throw new Error(`Failed to retrieve clients: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async getClientById(id: string): Promise<Omit<Client, 'authKey'>> {
        const client = await ClientModel.findById(id);
        if (!client) {
            throw new Error('Client not found');
        }
        return ClientModel.sanitizeClient(client);
    }

    static async deleteClient(id: string): Promise<{ status: boolean }> {
        const client = await ClientModel.findById(id);
        if (!client) {
            throw new Error('Client not found');
        }

        const subscriptions = await SubscriptionModel.findByClientUuid(id);
        const shops = await ShopModel.findByClientUuid(id);
        const workstations = await WorkstationModel.findByClientUuid(id);

        if (subscriptions.length > 0 || shops.length > 0 || workstations.length > 0) {
            throw new Error('Cannot delete client with existing subscriptions, shops, or workstations');
        }

        const deletedCount = await ClientModel.delete(id);
        if (deletedCount === 0) {
            throw new Error('Failed to delete client');
        }

        return { status: true };
    }

    static async verifyClient(clientUuid: string, authKey: string): Promise<Omit<Client, 'authKey'>> {
        const client = await ClientModel.findByCredentials(clientUuid, authKey);

        if (!client) {
            throw new Error('Invalid credentials');
        }

        await ClientModel.update(client.uuid, { status: 'active' });

        const updatedClient = { ...client, status: 'active' };

        // try {
        //     await this.sendAccountActivationEmail(updatedClient);
        // } catch (emailError) {
        //     console.error('Failed to send activation confirmation email:', emailError);
        // }

        return ClientModel.sanitizeClient(updatedClient);
    }

    static async updateClient(clientUuid: string, updateData: Partial<RegisterClientRequest>): Promise<Omit<Client, 'authKey'>> {
        const client = await ClientModel.findById(clientUuid);
        if (!client) {
            throw new Error('Client not found');
        }

        if (updateData.email && updateData.email !== client.email) {
            const existingClients = await ClientModel.findByEmail(updateData.email);
            if (existingClients.length > 0) {
                throw new Error('Email already exists');
            }
        }

        const numUpdated = await ClientModel.update(clientUuid, updateData);
        if (numUpdated === 0) {
            throw new Error('Failed to update client');
        }

        const updatedClient = await ClientModel.findById(clientUuid);
        if (!updatedClient) {
            throw new Error('Failed to retrieve updated client data');
        }

        return ClientModel.sanitizeClient(updatedClient);
    }

    static async getOnboardingStatus(clientUuid: string): Promise<OnboardingStatus> {
        const client = await ClientModel.findById(clientUuid);
        if (!client) {
            throw new Error('Client not found');
        }

        const subscriptions = await SubscriptionModel.findByClientUuid(clientUuid);
        const activeSubscription = subscriptions.find(sub => sub.status === 'active') || null;

        const shops = await ShopModel.findByClientUuid(clientUuid);
        const workstations = await WorkstationModel.findByClientUuid(clientUuid);

        const onboardingSteps = {
            client_registered: true,
            subscription_active: !!activeSubscription,
            shop_created: shops.length > 0,
            workstation_setup: workstations.length > 0
        };

        const completedSteps = Object.values(onboardingSteps).filter(Boolean).length;
        const totalSteps = Object.keys(onboardingSteps).length;
        const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

        const safeClient = ClientModel.sanitizeClient(client);

        return {
            client: safeClient,
            subscription: activeSubscription,
            shops,
            workstations,
            onboarding: {
                steps: onboardingSteps,
                completedSteps: completedSteps,
                totalSteps: totalSteps,
                completionPercentage: completionPercentage,
                isComplete: completionPercentage === 100
            } as any
        };
    }

    static async resendWelcomeEmail(clientUuid: string): Promise<boolean> {
        const client = await ClientModel.findById(clientUuid);
        if (!client) {
            throw new Error('Client not found');
        }

        try {
            await EmailService.sendWelcomeEmail({
                companyName: client.companyName,
                ownerName: client.ownerName,
                email: client.email,
                clientUuid: client.uuid,
                authKey: client.authKey,
            });

            console.log(`Welcome email resent successfully to ${client.email}`);
            return true;
        } catch (error) {
            console.error('Failed to resend welcome email:', error);
            throw new Error(`Failed to resend welcome email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private static async sendAccountActivationEmail(client: any): Promise<void> {
        const subject = `Account Activated - Welcome to Our Platform, ${client.companyName}!`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #28a745;">🎉 Account Successfully Activated!</h2>

                <p>Hello ${client.ownerName},</p>

                <p>Great news! Your account for <strong>${client.companyName}</strong> has been successfully activated.</p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p>You can now:</p>
                    <ul>
                        <li>Set up your subscription plan</li>
                        <li>Create and manage shops</li>
                        <li>Configure workstations</li>
                        <li>Access all platform features</li>
                    </ul>
                </div>

                <p>If you need any assistance getting started, our support team is here to help.</p>

                <p>Best regards,<br><strong>The Platform Team</strong></p>
            </div>
        `;

        await EmailService.sendEmail(client.email, subject, html);
    }

    static async sendCustomEmail(clientUuid: string, subject: string, message: string): Promise<boolean> {
        const client = await ClientModel.findById(clientUuid);
        if (!client) {
            throw new Error('Client not found');
        }

        try {
            await EmailService.sendEmail(client.email, subject, message);
            return true;
        } catch (error) {
            throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}