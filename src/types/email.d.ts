interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
}

interface WelcomeEmailData {
    companyName: string;
    ownerName: string;
    email: string;
    clientUuid: string;
    authKey: string;
    verificationUrl?: string;
}