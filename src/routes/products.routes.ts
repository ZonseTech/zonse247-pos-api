import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';

const router = Router();

router.post('/', ProductController.createProduct);
router.get('/', ProductController.listProducts);
router.get('/search/:term', ProductController.searchProduct);
router.get('/:productId', ProductController.getProduct);
router.put('/:productId', ProductController.updateProduct);
router.delete('/:productId', ProductController.deleteProduct);
router.post('/:productId/barcodes', ProductController.addBarcode);

export default router;
