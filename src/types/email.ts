export interface EmailConfig {
    provider: 'smtp' | 'resend';
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
    resendApiKey: string;
}

export interface WelcomeEmailData {
    businessName: string;
    tenantCode: string;
    ownerName: string;
    email: string;
    verificationToken: string;
    verificationUrl?: string;
    username?: string;
    password?: string;
}