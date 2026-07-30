import { Router } from 'express';
import { RolePermissionController } from '../controllers/role-permission.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { asyncHandler } from '../middlewares/error.middleware';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.get('/all', permissionMiddleware.requirePermission('roles.view'), asyncHandler(RolePermissionController.list));
router.post('/post', permissionMiddleware.requirePermission('roles.edit'), asyncHandler(RolePermissionController.create));
router.delete('/delete/:id', permissionMiddleware.requirePermission('roles.edit'), asyncHandler(RolePermissionController.delete));
router.post('/bulk/assign', permissionMiddleware.requirePermission('roles.edit'), asyncHandler(RolePermissionController.bulkAssign));
router.delete('/bulk/remove', permissionMiddleware.requirePermission('roles.edit'), asyncHandler(RolePermissionController.bulkRemove));
router.get('/role/:roleUuid', permissionMiddleware.requirePermission('roles.view'), asyncHandler(RolePermissionController.getByRoleUuid));
router.get('/permission/:permissionUuid', permissionMiddleware.requirePermission('roles.view'), asyncHandler(RolePermissionController.getByPermissionUuid));
router.get('/role/:roleUuid/permission/:permissionUuid', permissionMiddleware.requirePermission('roles.view'), asyncHandler(RolePermissionController.checkAssignment));

export default router;
