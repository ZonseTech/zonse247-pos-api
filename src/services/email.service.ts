import { EmailConfig, WelcomeEmailData } from 'email';
import { createTransport, Transporter } from 'nodemailer';

export class EmailService {
    private static transporter: Transporter | null = null;
    private static config: EmailConfig;

    static initialize(config: EmailConfig): void {
        this.config = config;
        this.transporter = createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.auth.user,
                pass: config.auth.pass,
            },
        });
    }

    static async verifyConnection(): Promise<boolean> {
        if (!this.transporter) {
            throw new Error('Email service not initialized');
        }

        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            console.error('Email service verification failed:', error);
            return false;
        }
    }

    static generateWelcomeEmailTemplate(data: WelcomeEmailData): { subject: string; html: string; text: string } {
        const baseUrl = process.env.CLIENT_PORTAL_URL || 'https://pos.zonse247.com';
        const verificationUrl = data.verificationUrl || `${baseUrl}/verify?clientId=${data.tenantCode}&verificationToken=${data.verificationToken}`;

        const subject = `Welcome to Our Platform, ${data.businessName}!`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Our Platform</title>
            </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Our Platform!</h1>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                        <h2 style="color: #333; margin-top: 0;">Hello ${data.ownerName},</h2>
                        
                        <p>Thank you for registering <strong>${data.businessName}</strong> with our platform! We're excited to have you on board.</p>
                    
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #667eea;">Your Account Details:</h3>
                            <p><strong>Company:</strong> ${data.businessName}</p>
                            <p><strong>Client ID:</strong> ${data.tenantCode}</p>
                            <p><strong>Authentication Key:</strong> ${data.verificationToken}</p>
                        </div>
                        
                        <p>To complete your registration and activate your account, please click the button below:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                            style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; transition: background 0.3s;">
                            Verify Your Account
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #666;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
                        </p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                            <h3>Next Steps:</h3>
                            <ol style="color: #666;">
                            <li>Verify your account using the link above</li>
                            <li>Set up your subscription plan</li>
                            <li>Create your first branch</li>
                            <li>Configure your terminals</li>
                            </ol>
                        </div>
                    
                        <p style="margin-top: 30px;">
                            If you have any questions or need assistance, please don't hesitate to contact our support team.
                        </p>
                        
                        <p>
                            Best regards,<br>
                            <strong>The Platform Team</strong>
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px;">
                        <p>This email was sent to ${data.email}. If you didn't register for this account, please ignore this email.</p>
                        <p>&copy; 2025 Your Company Name. All rights reserved.</p>
                    </div>
                </body>
            </html>
        `;

        const text = `
            Welcome to Our Platform!

            Hello ${data.ownerName},

            Thank you for registering ${data.businessName} with our platform! We're excited to have you on board.

            Your Account Details:
            - Company: ${data.businessName}
            - Email: ${data.email}
            - Client ID: ${data.tenantCode}

            To complete your registration and activate your account, please visit:
            ${verificationUrl}

            Next Steps:
            1. Verify your account using the link above
            2. Set up your subscription plan
            3. Create your first branch
            4. Configure your terminals

            If you have any questions or need assistance, please don't hesitate to contact our support team.

            Best regards,
            The Platform Team

            ---
            This email was sent to ${data.email}. If you didn't register for this account, please ignore this email.
            © 2025 Your Company Name. All rights reserved.
        `;

        return { subject, html, text };
    }

    static async sendWelcomeEmail(clientData: WelcomeEmailData): Promise<boolean> {
        if (!this.transporter) {
            throw new Error('Email service not initialized');
        }

        try {
            const { subject, html, text } = this.generateWelcomeEmailTemplate(clientData);

            const mailOptions = {
                from: this.config.from,
                to: clientData.email,
                subject,
                html,
                text,
            };

            const result = await this.transporter.sendMail(mailOptions);

            console.log('Welcome email sent successfully:', {
                messageId: result.messageId,
                to: clientData.email,
                company: clientData.businessName
            });

            return true;
        } catch (error) {
            console.error('Failed to send welcome email:', error);
            throw new Error(`Failed to send welcome email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async sendEmail(
        to: string,
        subject: string,
        html: string,
        text?: string
    ): Promise<boolean> {
        if (!this.transporter) {
            throw new Error('Email service not initialized');
        }

        try {
            const mailOptions = {
                from: this.config.from,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, ''),
            };

            const result = await this.transporter.sendMail(mailOptions);

            console.log('Email sent successfully:', {
                messageId: result.messageId,
                to,
                subject
            });

            return true;
        } catch (error) {
            console.error('Failed to send email:', error);
            throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}