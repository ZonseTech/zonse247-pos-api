// import config from './index';
import mysql from 'mysql2/promise';

const mysqlPool = mysql.createPool({
    host: '139.59.103.109',
    database: 'master_db',
    user: 'master',
    password: 'Master-2017',
});

export { mysqlPool };
