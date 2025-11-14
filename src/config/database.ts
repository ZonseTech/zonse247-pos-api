import config from './index';

export const databaseConfig = {
	development: {
		host: config.database.host,
		port: config.database.port,
		database: config.database.database,
		username: config.database.user,
		password: config.database.password,
		dialect: 'postgres' as const,
		logging: config.server.environment === 'development' ? console.log : false,
	},
	test: {
		host: config.database.host,
		port: config.database.port,
		database: `${config.database.database}_test`,
		username: config.database.user,
		password: config.database.password,
		dialect: 'postgres' as const,
		logging: false,
	},
	production: {
		host: config.database.host,
		port: config.database.port,
		database: config.database.database,
		username: config.database.user,
		password: config.database.password,
		dialect: 'postgres' as const,
		logging: false,
		pool: {
			max: 10,
			min: 0,
			acquire: 30000,
			idle: 10000,
		},
	},
};

export default databaseConfig;
