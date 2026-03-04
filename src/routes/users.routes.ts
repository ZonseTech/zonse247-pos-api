import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
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

router.use(generalLimiter);

router.get('/', asyncHandler(UserController.list));

router.post(
	'/',
	createAccountLimiter,
	validateBody(userValidationSchemas.createUser),
	asyncHandler(UserController.store)
);

router.get(
	'/:userId',
	validateParams(userValidationSchemas.userId),
	asyncHandler(UserController.show)
);

router.put(
	'/:userId',
	validateParams(userValidationSchemas.userId),
	validateBody(userValidationSchemas.updateUser),
	asyncHandler(UserController.update)
);

router.delete(
	'/:userId',
	validateParams(userValidationSchemas.userId),
	asyncHandler(UserController.delete)
);

export default router;
