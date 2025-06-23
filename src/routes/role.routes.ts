import { Request, Response, Router } from 'express';
import { RoleController } from '../controllers/role.controller';

const router = Router();

router.get('/', function (req: Request, res: Response): void {
    res.send('Role API');
});

router.get('/all', RoleController.list);
router.post('/post', RoleController.create);
router.put('/update/:id', RoleController.update);
router.get('/role/:id', RoleController.show);
router.delete('/role/:id', RoleController.delete);
router.get('/client/:clientUuid', RoleController.getByClientUuid);
router.get('/shop/:shopUuid', RoleController.getByShopUuid);
router.get('/system', RoleController.getSystemRoles);
router.get('/active', RoleController.getActiveRoles);
router.put('/activate/:id', RoleController.activate);
router.put('/deactivate/:id', RoleController.deactivate);
router.get('/role/:id/permissions', RoleController.getRolePermissions);
router.post('/role/:id/permissions', RoleController.assignPermissions);
router.delete('/role/:id/permissions/:permissionId', RoleController.removePermission);

export default router;