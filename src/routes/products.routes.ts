import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requireAnyPermission(['products.create', 'inventory.receive']), ProductController.createProduct);
router.get('/', permissionMiddleware.requireAnyPermission(['products.view', 'inventory.view']), ProductController.listProducts);
router.get('/name-available', permissionMiddleware.requireAnyPermission(['products.view', 'inventory.view']), ProductController.checkNameAvailability);
router.get('/search/:term', permissionMiddleware.requireAnyPermission(['products.view', 'inventory.view']), ProductController.searchProduct);
router.get('/:productId', permissionMiddleware.requireAnyPermission(['products.view', 'inventory.view']), ProductController.getProduct);
router.put('/:productId', permissionMiddleware.requireAnyPermission(['products.edit', 'inventory.adjust']), ProductController.updateProduct);
router.delete('/:productId', permissionMiddleware.requireAnyPermission(['products.delete', 'inventory.adjust']), ProductController.deleteProduct);
router.post('/:productId/barcodes', permissionMiddleware.requireAnyPermission(['products.edit', 'inventory.adjust']), ProductController.addBarcode);

export default router;
