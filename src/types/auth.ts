import { User } from "users";

export interface AccountActivationProps {
	authToken: string;
	tenantId: string;
}

export interface AccountActivationResponse {
	user: User;
	token: string;
	message: string;
}

export type AuthUser = {
	user: User;
	token: string;
};

export type AuthProps = { username: string; password: string };

export interface LoginResponse {
	token: string;
	message?: string;
	user: User;
}

export type TAuthTokenProps = {
	user: User;
};

export interface AuthenticatedUser {
	userId: string;
	tenantId: string;
	branchId: string;
}