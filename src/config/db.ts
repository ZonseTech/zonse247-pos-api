import config from './index';
import mysql from 'mysql2/promise';

const mysqlPool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
});

export { mysqlPool };
