import { Request, Response, Router } from 'express';
import { RolePermissionController } from '../controllers/role-permission.controller';

const router = Router();

router.get('/', function (req: Request, res: Response): void {
    res.send('Role Permission API');
});

router.get('/all', RolePermissionController.list);
router.post('/post', RolePermissionController.create);
router.delete('/delete/:id', RolePermissionController.delete);
router.post('/bulk/assign', RolePermissionController.bulkAssign);
router.delete('/bulk/remove', RolePermissionController.bulkRemove);
router.get('/role/:roleUuid', RolePermissionController.getByRoleUuid);
router.get('/permission/:permissionUuid', RolePermissionController.getByPermissionUuid);
router.get('/role/:roleUuid/permission/:permissionUuid', RolePermissionController.checkAssignment);

export default router;