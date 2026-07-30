import { Router } from 'express';
import { PermissionController } from '../controllers/permission.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { asyncHandler } from '../middlewares/error.middleware';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.use(permissionMiddleware.requirePermission('system.admin'));

router.get('/all', asyncHandler(PermissionController.list));
router.post('/post', asyncHandler(PermissionController.create));
router.put('/update/:id', asyncHandler(PermissionController.update));
router.get('/permission/:id', asyncHandler(PermissionController.show));
router.delete('/permission/:id', asyncHandler(PermissionController.delete));
router.get('/category/:category', asyncHandler(PermissionController.getByCategory));
router.get('/scope/:scope', asyncHandler(PermissionController.getByScope));
router.get('/system', asyncHandler(PermissionController.getSystemPermissions));
router.get('/categories', asyncHandler(PermissionController.getCategories));
router.get('/scopes', asyncHandler(PermissionController.getScopes));

export default router;
