import { Request, Response, Router } from 'express';
import { TerminalController } from '../controllers/terminal.controller';

const router: Router = Router();

router.get('/', function (req: Request, res: Response): void {
    res.send('Terminals endpoints');
});

router.get('/all', TerminalController.getAllTerminals);
router.post('/post', TerminalController.createTerminal);
router.put('/update/:id', TerminalController.updateTerminal);
router.get('/:id', TerminalController.getTerminal);
router.delete('/:id', TerminalController.deleteTerminal);
router.put('/status/:id', TerminalController.updateTerminalStatus);
router.post('/sync/:id', TerminalController.syncTerminal);

export default router;