import config from './index';
import mysql from 'mysql2/promise';

const mysqlPool = mysql.createPool(config.database);

export { mysqlPool };
