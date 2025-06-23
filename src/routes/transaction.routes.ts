import { Request, Response, Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';

const router = Router();

router.get('/', function (req: Request, res: Response): void {
	res.send('Transactions API');
});

router.get('/all', TransactionController.list);
router.get('/by-date', TransactionController.getByDateRange);
router.post('/post', TransactionController.create);
router.put('/update/:transactionId', TransactionController.update);
router.get('/transaction/:transactionId', TransactionController.show);
router.get('/transaction/:transactionId/summary', TransactionController.getSummary);
router.delete('/transaction/:transactionId', TransactionController.delete);

export default router;