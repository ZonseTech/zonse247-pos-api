import config from './index';
import { EmailService } from '../services/email.service';
import { EmailConfig } from 'email';

export const emailConfig: EmailConfig = {
    host: config.email.host || 'smtp.gmail.com',
    port: parseInt(config.email.port?.toString() || '587'),
    secure: config.email.secure === true,
    auth: {
        user: config.email.user || '',
        pass: config.email.password || '',
    },
    from: config.email.from || 'noreply-zonse247@gmail.com',
};

export const initializeEmailService = async (): Promise<void> => {
    try {
        EmailService.initialize(emailConfig);

        const isConnected = await EmailService.verifyConnection();
        if (isConnected) {
            console.log('✅ Email service initialized successfully');
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