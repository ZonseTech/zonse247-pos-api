export {
    SecureSettingsService,
} from './services/secure-settings.service';

export { DatabaseInitializer } from './databases/prisma/databaseInitializer';

export { 
    initializeConfig, 
    getConfig, 
    updateConfig,
    type RuntimeConfig 
} from './config/app.config';

import { Server } from './server';

export default Server;