import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';

const router = Router();

router.get('/', CategoryController.getWelcome);
router.get('/all', CategoryController.getAllCategories);
router.post('/category', CategoryController.createCategory);
router.put('/category/:categoryId', CategoryController.updateCategory);
router.delete('/category/:categoryId', CategoryController.deleteCategory);

export default router;