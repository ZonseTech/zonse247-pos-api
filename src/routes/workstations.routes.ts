import { Request, Response, Router } from 'express';
import { WorkStationController } from '../controllers/workstation.controller';

const router: Router = Router();

router.get('/', function (req: Request, res: Response): void {
    res.send('Work station endpoints');
});

router.get('/all', WorkStationController.getAllWorkstations);
router.post('/post', WorkStationController.createWorkstation);
router.put('/update/:id', WorkStationController.updateWorkstation);
router.get('/workstation/:id', WorkStationController.getWorkstation);
router.delete('/workstation/:id', WorkStationController.deleteWorkstation);
router.put('/status/:id', WorkStationController.updateWorkstationStatus);
router.post('/sync/:id', WorkStationController.syncWorkstation);

export default router;