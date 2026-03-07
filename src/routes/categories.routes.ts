import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { categoryValidationSchemas } from '../validations/category.schemas';
import { validateBody, validateParams } from '../middlewares/validation.middleware';

const router = Router();

router.get('/all', CategoryController.getAllCategories);
router.post(
    '/category',
    validateBody(categoryValidationSchemas.createCategory),
    CategoryController.createCategory
);
router.put(
    '/category/:categoryId',
    validateParams(categoryValidationSchemas.categoryIdParam),
    validateBody(categoryValidationSchemas.updateCategory),
    CategoryController.updateCategory
);
router.delete(
    '/category/:categoryId',
    validateParams(categoryValidationSchemas.categoryIdParam),
    CategoryController.deleteCategory
);

export default router;