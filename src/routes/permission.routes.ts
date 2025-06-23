import { Request, Response, Router } from 'express';
import { PermissionController } from '../controllers/permission.controller';

const router = Router();

router.get('/', function (req: Request, res: Response): void {
    res.send('Permission API');
});

router.get('/all', PermissionController.list);
router.post('/post', PermissionController.create);
router.put('/update/:id', PermissionController.update);
router.get('/permission/:id', PermissionController.show);
router.delete('/permission/:id', PermissionController.delete);
router.get('/category/:category', PermissionController.getByCategory);
router.get('/scope/:scope', PermissionController.getByScope);
router.get('/system', PermissionController.getSystemPermissions);
router.get('/categories', PermissionController.getCategories);
router.get('/scopes', PermissionController.getScopes);

export default router;