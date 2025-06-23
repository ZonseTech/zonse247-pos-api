import { Request, Response, Router } from 'express';
import { ClientController } from '../controllers/client.controller';

const router: Router = Router();

router.get('/', function (req: Request, res: Response): void {
    res.send('Client endpoints');
});

router.get('/all', ClientController.list);
router.post('/post', ClientController.store);
router.put('/update/:id', ClientController.update);
router.get('/client/:id', ClientController.show);
router.delete('/client/:id', ClientController.delete);
router.post('/register-client', ClientController.register);
router.put('/update-client/:clientUuid', ClientController.update);
router.get('/onboarding-status/:clientUuid', ClientController.getOnboardingStatus);

export default router;