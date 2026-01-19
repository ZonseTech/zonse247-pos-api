import { Router } from 'express';
import { TransactionMigrationController } from '../controllers/transaction-migration.controller';

const router = Router();

// Migration status - check how many transactions have been migrated
router.get('/status', TransactionMigrationController.getMigrationStatus);

// Run migration (POST for action, requires body with { dryRun?: boolean, batchSize?: number })
router.post('/run', TransactionMigrationController.runMigration);

// Unified data endpoints - combines both sales and legacy transactions
router.get('/unified', TransactionMigrationController.getUnifiedSales);
router.get('/unified/summary', TransactionMigrationController.getUnifiedSummary);

export default router;
