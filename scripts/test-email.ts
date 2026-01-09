#!/usr/bin/env npx tsx
/**
 * Email Test Script
 * Run with: npx tsx scripts/test-email.ts
 * Or: npm run test:email (if you add the script to package.json)
 */

import { createTransport } from 'nodemailer';

// Email configuration - update these values as needed
const EMAIL_CONFIG = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for 587
    user: 'zonse247@gmail.com',
    pass: 'bbhsmvxdqmirgsga', // App password from Google
    from: 'Zonse247 API <zonse247@gmail.com>',
};

// Test recipient - change this to your email
const TEST_RECIPIENT = 'zonse247@gmail.com';

async function testEmailConnection() {
    console.log('🔧 Email Test Script');
    console.log('='.repeat(50));
    console.log('\n📧 Configuration:');
    console.log(`   Host: ${EMAIL_CONFIG.host}`);
    console.log(`   Port: ${EMAIL_CONFIG.port}`);
    console.log(`   Secure: ${EMAIL_CONFIG.secure}`);
    console.log(`   User: ${EMAIL_CONFIG.user}`);
    console.log(`   From: ${EMAIL_CONFIG.from}`);
    console.log(`   To: ${TEST_RECIPIENT}`);
    console.log('');

    // Create transporter
    console.log('🔌 Creating transporter...');
    const transporter = createTransport({
        host: EMAIL_CONFIG.host,
        port: EMAIL_CONFIG.port,
        secure: EMAIL_CONFIG.secure,
        auth: {
            user: EMAIL_CONFIG.user,
            pass: EMAIL_CONFIG.pass,
        },
        tls: {
            rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        debug: true, // Enable debug output
        logger: true, // Log to console
    });

    // Step 1: Verify connection
    console.log('\n📡 Step 1: Verifying SMTP connection...');
    try {
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully!\n');
    } catch (error) {
        console.error('❌ SMTP connection failed:', error);
        console.log('\n🔍 Troubleshooting tips:');
        console.log('   1. Check if 2FA is enabled on your Google account');
        console.log('   2. Generate a new App Password at: https://myaccount.google.com/apppasswords');
        console.log('   3. Make sure IMAP is enabled in Gmail settings');
        console.log('   4. Try port 587 with secure: false');
        console.log('   5. Check firewall/network settings');
        process.exit(1);
    }

    // Step 2: Send test email
    console.log('📤 Step 2: Sending test email...');
    try {
        const result = await transporter.sendMail({
            from: EMAIL_CONFIG.from,
            to: TEST_RECIPIENT,
            subject: '🧪 Test Email from Zonse247 POS',
            text: 'This is a test email to verify SMTP configuration is working correctly.',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #667eea;">🎉 Email Test Successful!</h1>
                    <p>This is a test email from the Zonse247 POS API server.</p>
                    <p>If you're seeing this, your email configuration is working correctly.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Sent at: ${new Date().toISOString()}<br>
                        Server: ${EMAIL_CONFIG.host}:${EMAIL_CONFIG.port}
                    </p>
                </div>
            `,
        });

        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${result.messageId}`);
        console.log(`   Response: ${result.response}`);
        console.log(`\n📬 Check ${TEST_RECIPIENT} inbox (and spam folder)`);
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        process.exit(1);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ All tests passed!');
    process.exit(0);
}

// Run the test
testEmailConnection().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
