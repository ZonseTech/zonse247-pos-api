import { Router } from 'express'
import CategoriesRoutes from './categories.routes'
import CustomersRoutes from './customers.routes'
import AnalyticsRoutes from './dashboard.routes'
import DatabaseExportRoutes from './database-export.routes'
import HoldOrdersRoutes from './hold-orders.routes'
import InventoryRoutes from './inventory.routes'
import MigrationRoutes from './migration.routes'
import PaymentMethodRoutes from './payment-method.routes'
import TerminalSettingsRoutes from './terminal-settings.routes'
import SyncRoutes from './sync.routes'
import TransactionsRoutes from './transaction.routes'
import ReturnsRoutes from './return.routes'
import UsersRoutes from './users.routes'
import TenantsRoutes from './tenant.routes'
import SubscriptionsRoutes from './subscription.routes'
import SubscriptionPlanRoutes from './subscription-plan.routes'
import PlanFeaturesRoutes from './plan-features.routes'
import BranchesRoutes from './branch.routes'
import TerminalRoutes from './terminal.routes'
import RoleRoutes from './role.routes'
import MailingRoutes from './email.routes'
import OnboardingRoutes from './onboarding.routes'
import AuthRoutes from './auth.routes'
import PermissionRoutes from './permission.routes'
import RolePermissionRoutes from './role-permission.routes'
import ProductsRoutes from './products.routes'
import SuppliersRoutes from './suppliers.routes'
import PurchaseOrdersRoutes from './purchase-orders.routes'
import SalesRoutes from './sales.routes'
import StockMovementsRoutes from './stock-movements.routes'
import PrinterRoutes from './printer.routes'
import TenantRegistrationDetailRoutes from './tenant-registration-detail.routes'
import { AuthMiddleware } from '../middlewares/auth.middleware'
import { apiMiddleware } from '../middlewares/api.middleware'
import { preventSQLInjection, preventXSS, sanitizeInput } from '../middlewares/security.middleware'
import { authLimiter } from '../middlewares/rate-limit.middleware'
import PaymentServiceProviderRoutes from './payment-service-provider.routes'
import MetadataRoutes from './metadata.routes'
import AccountSeedsRoutes from './account-seeds.routes'
import { MetadataMiddleware } from '../middlewares/metadata.middleware'
import { validateBody } from '../middlewares/validation.middleware'
import { userValidationSchemas } from '../validations/user.schemas'
import { asyncHandler } from '../middlewares/error.middleware'
import { AuthController } from '../controllers/auth.controller'
import { TenantMiddleware } from '../middlewares/tenant.middleware'

const router = Router();
const authMiddleware = new AuthMiddleware();
const tenantMiddleware = new TenantMiddleware();

router.use(sanitizeInput);
router.use(preventSQLInjection);
router.use(preventXSS);

router.use((req, res, next) => {
    next();
});

router.use(apiMiddleware.verifyClientType)

router.use('/on-boarding', OnboardingRoutes);
router.use('/account-seeds', AccountSeedsRoutes)
router.use('/metadata', MetadataMiddleware.validateKeys, MetadataRoutes);

router.post(
    '/auth/live/login',
    validateBody(userValidationSchemas.loginUser),
    asyncHandler(AuthController.initiateLoginAccount)
);

router.use('/plan-features', PlanFeaturesRoutes);

router.use('/auth', authLimiter, AuthRoutes);

router.use(tenantMiddleware.verifyRequestHeaders)
router.use(tenantMiddleware.subscriptionStatus)
router.use(authMiddleware.verifyToken)

router.use('/terminal-settings', TerminalSettingsRoutes);
router.use('/tenants', TenantsRoutes);
router.use('/branches', BranchesRoutes);

router.use('/mailing', MailingRoutes);
router.use('/export', DatabaseExportRoutes);
router.use('/sync', SyncRoutes);
router.use('/payment-service-providers', PaymentServiceProviderRoutes);
router.use('/users', UsersRoutes);
router.use('/analytics', AnalyticsRoutes);
router.use('/inventory', InventoryRoutes);
router.use('/customers', CustomersRoutes);
router.use('/categories', CategoriesRoutes);
router.use('/payment-methods', PaymentMethodRoutes);
router.use('/migration', MigrationRoutes);
router.use('/transactions', TransactionsRoutes);
router.use('/returns', ReturnsRoutes);
router.use('/hold-orders', HoldOrdersRoutes);
router.use('/subscriptions', SubscriptionsRoutes);
router.use('/subscription-plans', SubscriptionPlanRoutes);
router.use('/terminals', TerminalRoutes);
router.use('/roles', RoleRoutes);
router.use('/permissions', PermissionRoutes);
router.use('/role-permissions', RolePermissionRoutes);
router.use('/products', ProductsRoutes);
router.use('/suppliers', SuppliersRoutes);
router.use('/purchase-orders', PurchaseOrdersRoutes);
router.use('/sales', SalesRoutes);
router.use('/stock-movements', StockMovementsRoutes);
router.use('/printers', PrinterRoutes);
router.use('/tenant-registration-details', TenantRegistrationDetailRoutes);

export default router