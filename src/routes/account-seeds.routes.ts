import { Router } from "express";
import { RoleController } from "../controllers/role.controller";
import { PermissionController } from "../controllers/permission.controller";
import { RolePermissionController } from "../controllers/role-permission.controller";
import { UserController } from "../controllers/user.controller";
import { CustomerController } from "../controllers/customer.controller";
import { CategoryController } from "../controllers/category.controller";
import { SubscriptionPlanController } from "../controllers/subscription-plan.controller";
import { SubscriptionController } from "../controllers/subscription.controller";
import { PaymentMethodController } from "../controllers/payment-method.controller";
import { PaymentServiceProviderController } from "../controllers/payment-service-provider.controller";
import { MetadataController } from "../controllers/metadata.controller";

const router = Router();

router.post('/roles', RoleController.selectAll)
router.post('/permissions', PermissionController.selectAll)
router.post('/role-permissions', RolePermissionController.selectAll)
router.post('/default-user', UserController.selectAll)
router.post('/customer', CustomerController.selectAll)
router.post('/category', CategoryController.selectAll)
router.post('/subscription-plans', SubscriptionPlanController.selectAll)
router.post('/tenant-subscription', SubscriptionController.selectAll)
router.post('/payment-methods', PaymentMethodController.selectAll)
router.post('/payment-service-provider', PaymentServiceProviderController.selectAll)
router.post('/sync-all', MetadataController.syncAll)

export default router;
