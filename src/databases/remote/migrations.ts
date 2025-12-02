import { mysqlPool } from '../../config/db';

const testConnection = async () => {
    try {
        const connection = await mysqlPool.getConnection();
        console.log('Database connection established successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('Error connecting to the database:', error);
        return false;
    }
};

export { testConnection };