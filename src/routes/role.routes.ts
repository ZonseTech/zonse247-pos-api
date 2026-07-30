import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { asyncHandler } from '../middlewares/error.middleware';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.get('/', permissionMiddleware.requirePermission('roles.view'), asyncHandler(RoleController.list));
router.get('/all', permissionMiddleware.requirePermission('roles.view'), asyncHandler(RoleController.list));
router.post('/post', permissionMiddleware.requirePermission('roles.create'), asyncHandler(RoleController.create));
router.put('/update/:id', permissionMiddleware.requirePermission('roles.edit'), asyncHandler(RoleController.update));
router.get('/role/:id', permissionMiddleware.requirePermission('roles.view'), asyncHandler(RoleController.show));
router.delete('/role/:id', permissionMiddleware.requirePermission('roles.delete'), asyncHandler(RoleController.delete));
router.get('/system', permissionMiddleware.requirePermission('roles.view'), asyncHandler(RoleController.getSystemRoles));
router.get('/active', permissionMiddleware.requirePermission('roles.view'), asyncHandler(RoleController.getActiveRoles));
router.put('/activate/:id', permissionMiddleware.requirePermission('roles.edit'), asyncHandler(RoleController.activate));
router.put('/deactivate/:id', permissionMiddleware.requirePermission('roles.edit'), asyncHandler(RoleController.deactivate));
router.get('/role/:id/permissions', permissionMiddleware.requirePermission('roles.view'), asyncHandler(RoleController.getRolePermissions));
router.post('/role/:id/permissions', permissionMiddleware.requirePermission('roles.edit'), asyncHandler(RoleController.assignPermissions));
router.delete('/role/:id/permissions/:permissionId', permissionMiddleware.requirePermission('roles.edit'), asyncHandler(RoleController.removePermission));

export default router;
