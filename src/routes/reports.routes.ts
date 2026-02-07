import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';

const router = Router();

router.get('/summary', ReportController.getSummary);
router.get('/total-sales', ReportController.getTotalSales);

export default router;
