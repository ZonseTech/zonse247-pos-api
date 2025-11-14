import server from './server';

try {
    server.start();
} catch (error) {
    server.stop();
}
