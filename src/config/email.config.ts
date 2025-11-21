import { EmailService } from '../services/email.service';
import { EmailConfig } from 'email';

export const emailConfig: EmailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT?.toString() || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || 'noreply-zonse247@gmail.com',
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