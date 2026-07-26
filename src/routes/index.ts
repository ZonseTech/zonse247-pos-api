import { Router } from 'express'
import CategoriesRoutes from './categories.routes'
import CustomersRoutes from './customers.routes'
import InventoryRoutes from './inventory.routes'
import PaymentMethodRoutes from './payment-method.routes'
import TerminalSettingsRoutes from './terminal-settings.routes'
import ReturnsRoutes from './return.routes'
import UsersRoutes from './users.routes'
import TenantsRoutes from './tenant.routes'
import SubscriptionsRoutes from './subscription.routes'
import SubscriptionPlanRoutes from './subscription-plan.routes'
import BranchesRoutes from './branch.routes'
import TerminalRoutes from './terminal.routes'
import RoleRoutes from './role.routes'
import OnboardingRoutes from './onboarding.routes'
import AuthRoutes from './auth.routes'
import PermissionRoutes from './permission.routes'
import RolePermissionRoutes from './role-permission.routes'
import ProductsRoutes from './products.routes'
import SuppliersRoutes from './suppliers.routes'
import PurchaseOrdersRoutes from './purchase-orders.routes'
import PurchaseRequisitionsRoutes from './purchase-requisitions.routes'
import GoodsReceiptsRoutes from './goods-receipts.routes'
import SupplierInvoicesRoutes from './supplier-invoices.routes'
import SupplierPaymentsRoutes from './supplier-payments.routes'
import SupplierReturnsRoutes from './supplier-returns.routes'
import ExpensesRoutes from './expenses.routes'
import ExpenseCategoriesRoutes from './expense-categories.routes'
import SalesRoutes from './sales.routes'
import ParkedSalesRoutes from './parked-sales.routes'
import StockMovementsRoutes from './stock-movements.routes'
import InventoryValuationRoutes from './inventory-valuation.routes'
import PrinterRoutes from './printer.routes'
import DistrictRoutes from './district.routes'
import LoyaltyRoutes from './loyalty.routes'
import ResourcesRoutes from './resources.routes'
import StaffRoutes from './staff.routes'
import ServicesRoutes from './services.routes'
import ServiceOrdersRoutes from './service-orders.routes'
import { AuthMiddleware } from '../middlewares/auth.middleware'
import { apiMiddleware } from '../middlewares/api.middleware'
import { preventSQLInjection, preventXSS, sanitizeInput } from '../middlewares/security.middleware'
import { authLimiter } from '../middlewares/rate-limit.middleware'
import PaymentServiceProviderRoutes from './payment-service-provider.routes'
import ReportsRoutes from './reports.routes'
import DashboardRoutes from './dashboard.routes'
import MraRoutes from './mra.routes'
import SyncRoutes from './sync.routes'
import { TenantMiddleware } from '../middlewares/tenant.middleware'
import { BranchMiddleware } from '../middlewares/branch.middleware'

const router = Router();
const authMiddleware = new AuthMiddleware();
const tenantMiddleware = new TenantMiddleware();
const branchMiddleware = new BranchMiddleware();

router.use(sanitizeInput);
router.use(preventSQLInjection);
router.use(preventXSS);

router.use((req, res, next) => {
    next();
});

router.use(apiMiddleware.verifyClientType)

router.use('/onboarding', OnboardingRoutes);
router.use('/auth', authLimiter, AuthRoutes);

router.use(authMiddleware.verifyToken)

router.use(apiMiddleware.verifyRequestHeaders)
router.use(tenantMiddleware.tenantStatus)
router.use(branchMiddleware.validateBranchSubscription)

router.use('/terminal-settings', TerminalSettingsRoutes);
router.use('/tenants', TenantsRoutes);
router.use('/branches', BranchesRoutes);
router.use('/districts', DistrictRoutes);

router.use('/payment-service-providers', PaymentServiceProviderRoutes);
router.use('/users', UsersRoutes);
router.use('/inventory', InventoryRoutes);
router.use('/customers', CustomersRoutes);
router.use('/categories', CategoriesRoutes);
router.use('/payment-methods', PaymentMethodRoutes);
router.use('/returns', ReturnsRoutes);
router.use('/subscriptions', SubscriptionsRoutes);
router.use('/subscription-plans', SubscriptionPlanRoutes);
router.use('/terminals', TerminalRoutes);
router.use('/roles', RoleRoutes);
router.use('/permissions', PermissionRoutes);
router.use('/role-permissions', RolePermissionRoutes);
router.use('/products', ProductsRoutes);
router.use('/suppliers', SuppliersRoutes);
router.use('/purchase-orders', PurchaseOrdersRoutes);
router.use('/purchase-requisitions', PurchaseRequisitionsRoutes);
router.use('/goods-receipts', GoodsReceiptsRoutes);
router.use('/supplier-invoices', SupplierInvoicesRoutes);
router.use('/supplier-payments', SupplierPaymentsRoutes);
router.use('/supplier-returns', SupplierReturnsRoutes);
router.use('/expenses', ExpensesRoutes);
router.use('/expense-categories', ExpenseCategoriesRoutes);
router.use('/sales', SalesRoutes);
router.use('/parked-sales', ParkedSalesRoutes);
router.use('/stock-movements', StockMovementsRoutes);
router.use('/inventory-valuation', InventoryValuationRoutes);
router.use('/printers', PrinterRoutes);
router.use('/reports', ReportsRoutes);
router.use('/dashboard', DashboardRoutes);
router.use('/mra', MraRoutes);
router.use('/sync', SyncRoutes);
router.use('/loyalty', LoyaltyRoutes);
router.use('/resources', ResourcesRoutes);
router.use('/staff', StaffRoutes);
router.use('/services', ServicesRoutes);
router.use('/service-orders', ServiceOrdersRoutes);

export default router
