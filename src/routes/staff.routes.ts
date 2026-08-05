import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { staffSchemas } from '../validations/staff.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requirePermission('users.create'), validateBody(staffSchemas.createStaff), StaffController.createStaff);
router.get('/', permissionMiddleware.requirePermission('users.view'), validateQuery(staffSchemas.listQuery), StaffController.listStaff);
router.get('/:staffId', permissionMiddleware.requirePermission('users.view'), validateParams(staffSchemas.staffIdParam), StaffController.getStaff);
router.put(
  '/:staffId',
  permissionMiddleware.requirePermission('users.edit'),
  validateParams(staffSchemas.staffIdParam),
  validateBody(staffSchemas.updateStaff),
  StaffController.updateStaff
);
router.delete('/:staffId', permissionMiddleware.requirePermission('users.delete'), validateParams(staffSchemas.staffIdParam), StaffController.deleteStaff);

export default router;
