interface AccountActivationProps {
	authToken: string;
	clientUuid: string;
}

interface AccountActivationResponse {
	user: User;
	token: string;
	message: string;
}

type AuthUser = {
	user: User;
	token: string;
};

type AuthProps = { username: string; password: string };

interface LoginResponse {
	token: string;
	message?: string;
	user: User;
}

type TAuthTokenProps = {
	user: User;
};

interface AuthenticatedUser {
	userId: string;
	tenantId: string;
	branchId: string;
}