import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import {
	createAccountLimiter,
	generalLimiter,
} from '../middlewares/rate-limit.middleware';
import {
	validateBody,
	validateParams,
} from '../middlewares/validation.middleware';
import { userValidationSchemas } from '../validations/user.schemas';
import { asyncHandler } from '../middlewares/error.middleware';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.use(generalLimiter);

router.get('/', permissionMiddleware.requirePermission('users.view'), asyncHandler(UserController.list));

router.post(
	'/',
	permissionMiddleware.requirePermission('users.create'),
	createAccountLimiter,
	validateBody(userValidationSchemas.createUser),
	asyncHandler(UserController.store)
);

router.get(
	'/:userId',
	permissionMiddleware.requirePermission('users.view'),
	validateParams(userValidationSchemas.userId),
	asyncHandler(UserController.show)
);

router.put(
	'/:userId',
	permissionMiddleware.requirePermission('users.edit'),
	validateParams(userValidationSchemas.userId),
	validateBody(userValidationSchemas.updateUser),
	asyncHandler(UserController.update)
);

router.delete(
	'/:userId',
	permissionMiddleware.requirePermission('users.delete'),
	validateParams(userValidationSchemas.userId),
	asyncHandler(UserController.delete)
);

export default router;
