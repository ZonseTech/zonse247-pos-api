import { Router } from "express";
import { validateBody, validateParams } from "../middlewares/validation.middleware";
import { userValidationSchemas } from "../validations/user.schemas";
import { asyncHandler } from "../middlewares/error.middleware";
import { AuthController } from "../controllers/auth.controller";
import { createUserSpecificLimiter } from "../middlewares/rate-limit.middleware";
import { AuthMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const authMiddleware = new AuthMiddleware();

router.post(
    '/login',
    validateBody(userValidationSchemas.loginUser),
    asyncHandler(AuthController.login)
);

router.post(
    '/refresh-token',
    validateBody(userValidationSchemas.refreshToken),
    asyncHandler(AuthController.refreshToken)
);

router.post(
    '/verify-token',
    asyncHandler(AuthController.verifyToken)
);

router.get(
    '/logout/:userId',
    validateParams(userValidationSchemas.userId),
    asyncHandler(AuthController.logout)
)

router.post(
    '/reset-password/:userId',
    validateParams(userValidationSchemas.userId),
    asyncHandler(AuthController.resetPassword)
);

router.post(
    '/switch-branch',
    authMiddleware.verifyToken,
    asyncHandler(AuthController.switchBranch)
);

router.get(
    '/accessible-branches',
    authMiddleware.verifyToken,
    asyncHandler(AuthController.getAccessibleBranches)
);

router.put(
    '/change-password/:userId',
    validateParams(userValidationSchemas.userId),
    validateBody(userValidationSchemas.changePassword),
    authMiddleware.verifyOwnership,
    createUserSpecificLimiter(
        60 * 60 * 1000,
        5,
        'Too many password change attempts, please try again later'
    ),
    asyncHandler(AuthController.changePassword)
);

export default router;