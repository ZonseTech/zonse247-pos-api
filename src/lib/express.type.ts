import { Request } from "express";

interface AuthRequestBase extends Request {
    auth?: User;
    requestStartTime: number;
    tenant?: {
        id: string;
        plan: string;
    };
}

export type AuthRequest = AuthRequestBase;
