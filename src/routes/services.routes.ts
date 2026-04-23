import { Router } from 'express';
import { ServiceCatalogController } from '../controllers/service-catalog.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { serviceCatalogSchemas } from '../validations/service-catalog.schemas';

const router = Router();

router.post('/', validateBody(serviceCatalogSchemas.createService), ServiceCatalogController.createService);
router.get('/summary', validateQuery(serviceCatalogSchemas.summaryQuery), ServiceCatalogController.getSummary);
router.get('/', validateQuery(serviceCatalogSchemas.listQuery), ServiceCatalogController.listServices);
router.get('/:id', validateParams(serviceCatalogSchemas.idParam), ServiceCatalogController.getService);
router.put(
  '/:id',
  validateParams(serviceCatalogSchemas.idParam),
  validateBody(serviceCatalogSchemas.updateService),
  ServiceCatalogController.updateService
);
router.delete('/:id', validateParams(serviceCatalogSchemas.idParam), ServiceCatalogController.deleteService);

export default router;
