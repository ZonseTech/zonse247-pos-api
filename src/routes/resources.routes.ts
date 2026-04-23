import { Router } from 'express';
import { ResourceController } from '../controllers/resource.controller';
import { resourceValidationSchemas } from '../validations/resource.schemas';
import { validateBody, validateParams } from '../middlewares/validation.middleware';

const router = Router();

router.get('/', ResourceController.listResources);
router.get('/:resourceId', validateParams(resourceValidationSchemas.resourceIdParam), ResourceController.getResource);
router.post('/', validateBody(resourceValidationSchemas.createResource), ResourceController.createResource);
router.patch(
  '/:resourceId',
  validateParams(resourceValidationSchemas.resourceIdParam),
  validateBody(resourceValidationSchemas.updateResource),
  ResourceController.updateResource
);
router.delete('/:resourceId', validateParams(resourceValidationSchemas.resourceIdParam), ResourceController.deleteResource);

export default router;
