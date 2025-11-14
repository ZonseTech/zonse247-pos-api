import { Request, Response, Router } from 'express';
import { BranchController } from '../controllers/branch.controller';

const router = Router();

router.get('/', function (req: Request, res: Response): void {
    res.send('Branch endpoints');
});

router.get('/all', BranchController.list);
router.post('/post', BranchController.create);
router.put('/update/:id', BranchController.update);
router.get('/:id', BranchController.show);
router.delete('/:id', BranchController.delete);

export default router;