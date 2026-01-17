import { getConfig } from './app.config';

export const corsOptions = {
	origin: (
		origin: string | undefined,
		callback: (err: Error | null, allow?: boolean) => void
	) => {
		if (!origin) return callback(null, true);

		const allowedOrigins = getConfig().corsAllowedOrigins.split(',');
		if (allowedOrigins.includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
	allowedHeaders: [
		'Origin',
		'X-Requested-With',
		'Content-Type',
		'Accept',
		'Authorization',
		'X-Access-Token',
		'X-Key',
		'X-Tenant-Signature',
		'x-tenant-signature',
		'x-client-type',
		'X-Client-Type',
		'x-tenant-id',
		'X-Tenant-Id',
		'X-Branch-Id',
		'x-branch-id',
	],
	maxAge: 86400,
};
