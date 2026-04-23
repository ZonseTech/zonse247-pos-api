import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { staffSchemas } from '../validations/staff.schemas';

const router = Router();

router.post('/', validateBody(staffSchemas.createStaff), StaffController.createStaff);
router.get('/', validateQuery(staffSchemas.listQuery), StaffController.listStaff);
router.get('/:staffId', validateParams(staffSchemas.staffIdParam), StaffController.getStaff);
router.put(
  '/:staffId',
  validateParams(staffSchemas.staffIdParam),
  validateBody(staffSchemas.updateStaff),
  StaffController.updateStaff
);
router.delete('/:staffId', validateParams(staffSchemas.staffIdParam), StaffController.deleteStaff);

export default router;
