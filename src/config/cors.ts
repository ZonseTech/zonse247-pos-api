export const corsOptions = {
	origin: (
		origin: string | undefined,
		callback: (err: Error | null, allow?: boolean) => void
	) => {
		if (!origin) return callback(null, true);

		if ((process.env.CORS_ALLOWED_ORIGINS || []).includes(origin)) {
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
		'x-tenant-signature'
	],
	maxAge: 86400,
};
