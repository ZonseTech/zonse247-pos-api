import { Server } from './server';

const server = new Server(null)

try {
    server.start();
} catch (error) {
    server.stop();
}
