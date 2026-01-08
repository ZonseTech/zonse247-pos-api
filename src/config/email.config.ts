import { EmailService } from '../services/email.service';
import { EmailConfig } from 'email';
import { getConfig } from './app.config';

export const getEmailConfig = (): EmailConfig => {
    const config = getConfig();
    return {
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
            user: config.smtpUser,
            pass: config.smtpPass,
        },
        from: config.smtpFrom,
    };
};

export const initializeEmailService = async (): Promise<void> => {
    try {
        EmailService.initialize(getEmailConfig());

        const isConnected = await EmailService.verifyConnection();
        if (isConnected) {
            console.log('✓ Email service initialized successfully');
        } else {
            console.warn('⚠️  Email service initialized but connection verification failed');
        }
    } catch (error) {
        console.error('❌ Failed to initialize email service:', error);
        throw error;
    }
};

export const checkEmailServiceHealth = async (): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    timestamp: Date;
}> => {
    try {
        const isConnected = await EmailService.verifyConnection();
        return {
            status: isConnected ? 'healthy' : 'unhealthy',
            message: isConnected ? 'Email service is working correctly' : 'Email service connection failed',
            timestamp: new Date(),
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            message: `Email service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date(),
        };
    }
};