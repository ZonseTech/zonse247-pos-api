import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import {
	createAccountLimiter,
	createUserSpecificLimiter,
	generalLimiter,
} from '../middlewares/rate-limit.middleware';
import {
	validateBody,
	validateParams,
} from '../middlewares/validation.middleware';
import { userValidationSchemas } from '../validations/user.schemas';
import { asyncHandler } from '../middlewares/error.middleware';

const router = Router();
const authMiddleware = new AuthMiddleware();

router.use(generalLimiter);

router.get('/', asyncHandler(UserController.healthCheck));

router.get(
	'/profile/:id',
	validateParams(userValidationSchemas.userId),
	authMiddleware.verifyOwnership,
	asyncHandler(UserController.show)
);

router.put(
	'/profile/:id',
	validateParams(userValidationSchemas.userId),
	validateBody(userValidationSchemas.updateUser),
	authMiddleware.verifyOwnership,
	authMiddleware.verifyPasswordStrength,
	createUserSpecificLimiter(
		60 * 60 * 1000,
		10,
		'Too many profile updates, please try again later'
	),
	asyncHandler(UserController.update)
);

router.get('/list', asyncHandler(UserController.list));

// router.use(authMiddleware.requireAdmin);

router.delete(
	'/profile/:id',
	validateParams(userValidationSchemas.userId),
	authMiddleware.verifyOwnership,
	createUserSpecificLimiter(
		60 * 60 * 1000,
		3,
		'Too many deletion attempts, please try again later'
	),
	asyncHandler(UserController.delete)
);

router.post(
	'/',
	createAccountLimiter,
	validateBody(userValidationSchemas.createUser),
	authMiddleware.verifyPasswordStrength,
	asyncHandler(UserController.store)
);

router.get(
	'/:id',
	validateParams(userValidationSchemas.id),
	asyncHandler(UserController.show)
);

router.put(
	'/:id',
	validateParams(userValidationSchemas.id),
	validateBody(userValidationSchemas.updateUser),
	authMiddleware.verifyPasswordStrength,
	asyncHandler(UserController.update)
);

router.delete(
	'/:id',
	validateParams(userValidationSchemas.userId),
	asyncHandler(UserController.delete)
);

router.put(
	'/status/:id',
	validateParams(userValidationSchemas.userId),
	validateBody(userValidationSchemas.updateUserStatus),
	asyncHandler(UserController.updateUserStatus)
);

router.get(
	'/role/:roleId',
	validateParams(userValidationSchemas.roleId),
	asyncHandler(UserController.getUsersByRole)
);

router.get(
	'/branch/:branchUuid',
	validateParams(userValidationSchemas.branchUuid),
	asyncHandler(UserController.getUsersByBranch)
);

export default router;