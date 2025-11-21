import { v4 as uuidv4 } from 'uuid';
import {
	CATEGORIES_DB,
	TENANT_SUBSCRIPTIONS_TABLE,
	TENANT_TABLE,
	CUSTOMERS_DB,
	PAYMENT_METHODS_DB,
	PAYMENT_SERVICE_PROVIDERS_DB,
	PERMISSIONS_DB,
	ROLE_PERMISSIONS_DB,
	ROLES_DB,
	SHOP_SETTINGS_DB,
	BRANCHES_TABLE,
	SUBSCRIPTION_PLANS_TABLE,
	USERS_DB,
	TERMINALS_TABLE,
} from '../tables';
import bcrypt from 'bcryptjs';
import { sealDBModel } from '..';
import { DEFAULT_PERMISSIONS } from './permission.seed';
import { DEFAULT_ROLE_PERMISSIONS } from './role-permissions.seed';
import type { Permission, Role, RolePermission } from 'role-permission';
import type { Tenant } from 'tenant';
import type { Branch } from 'branch';
import type { Terminal } from 'terminal';
import type { SubscriptionPlan, TenantSubscription } from 'subscription';
import type { User } from 'users';
import type { Customer } from 'customer';
import type { TerminalSettings } from 'settings';
import type { Category } from 'categoty';
import type { PaymentMethod } from 'payment-method';
import type { PaymentServiceProvider } from 'payment-service-provider';

const now = new Date();

const checkOrCreateDefaultRoles = async () => {
	try {
		const superAdminRole = await sealDBModel.findById(ROLES_DB, { roleId: 'super-admin' });
		if (!superAdminRole) {
			const defaultSuperAdminRole: Role = {
				roleId: 'super-admin',
				tenantId: '-1',
				branchId: '-1',
				name: 'super_admin',
				displayName: 'Super Administrator',
				description: 'System super administrator with full access',
				isSystemRole: true,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			await sealDBModel.insert(ROLES_DB, defaultSuperAdminRole);
		}

		const adminRole = await sealDBModel.findById(ROLES_DB, { roleId: 'admin' });
		if (!adminRole) {
			const defaultAdminRole: Role = {
				roleId: 'admin',
				tenantId: '-1',
				branchId: '-1',
				name: 'admin',
				displayName: 'Administrator',
				description: 'Shop administrator with full shop access',
				isSystemRole: true,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			await sealDBModel.insert(ROLES_DB, defaultAdminRole);
		}

		const managerRole = await sealDBModel.findById(ROLES_DB, { roleId: 'manager' });
		if (!managerRole) {
			const defaultManagerRole: Role = {
				roleId: 'manager',
				tenantId: '-1',
				branchId: '-1',
				name: 'manager',
				displayName: 'Manager',
				description: 'Shop manager with limited administrative access',
				isSystemRole: true,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			await sealDBModel.insert(ROLES_DB, defaultManagerRole);
		}

		const cashierRole = await sealDBModel.findById(ROLES_DB, { roleId: 'cashier' });
		if (!cashierRole) {
			const defaultCashierRole: Role = {
				roleId: 'cashier',
				tenantId: '-1',
				branchId: '-1',
				name: 'cashier',
				displayName: 'Cashier',
				description: 'Basic cashier role for sales operations',
				isSystemRole: true,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			await sealDBModel.insert(ROLES_DB, defaultCashierRole);
		}
	} catch (err) {
		console.error('Error creating default roles:', err);
	}
};

const checkOrCreateDefaultPermissions = async () => {
	try {
		for (const permission of DEFAULT_PERMISSIONS) {
			const existing = await sealDBModel.findById<Permission>(
				PERMISSIONS_DB,
				{ permissionId: permission.permissionId }
			);
			if (!existing) {
				await sealDBModel.insert(PERMISSIONS_DB, permission);
			}
		}
	} catch (err) {
		console.error('Error creating default permissions:', err);
	}
};

const checkOrCreateDefaultRolePermissions = async () => {
	try {
		for (const rp of DEFAULT_ROLE_PERMISSIONS) {
			const existingId = `${rp.rolePermissionId}-${rp.permissionId}`;
			const existing = await sealDBModel.findById(
				ROLE_PERMISSIONS_DB,
				{ rolePermissionId: existingId }
			);
			if (!existing) {
				const rolePermission: RolePermission = {
					rolePermissionId: existingId,
					roleId: rp.roleId,
					permissionId: rp.permissionId,
					createdAt: new Date(),
				};
				await sealDBModel.insert(ROLE_PERMISSIONS_DB, rolePermission);
			}
		}
	} catch (err) {
		console.error('Error creating default role permissions:', err);
	}
};

const checkOrCreateDefaultTenant = async () => {
	try {
		const tenant = await sealDBModel.findById(TENANT_TABLE, { tenantId: '-1' });
		if (tenant) return;

		const defaultTenant: Tenant = {
			tenantId: '-1',
			tenantCode: 'DEFAULT_CLIENT',
			businessName: 'Default Company',
			tradingName: 'Default Trading Name',
			tin: '000000000',
			businessType: 'PRODUCT_BASED',
			ownerName: 'System Administrator',
			email: 'admin@example.com',
			phoneNumber: '+1234567890',
			address: '123 Business Street',
			country: 'MW',
			mraPortalUsername: 'admin',
			msonkhoOnlineStatus: 'PENDING',
			subscriptionPlan: 'BASIC',
			subscriptionStatus: 'TRIAL',
			verificationToken: `default-auth-key-${Date.now()}`,
			status: 'active',
			registeredAt: now,
			activatedAt: now,
			trialEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
			isVatRegistered: false,
			taxOfficeCode: null,
			synced: false,
			createdAt: now,
			updatedAt: now,
		};

		await sealDBModel.insert(TENANT_TABLE, defaultTenant);
		console.log('✅ Default tenant created successfully');
	} catch (err) {
		console.error('❌ Error creating default tenant:', err);
	}
};

const checkOrCreateDefaultBranch = async () => {
	try {
		const branch = await sealDBModel.findById(BRANCHES_TABLE, { branchId: '-1' });
		if (branch) return;

		const defaultBranch: Branch = {
			branchId: '-1',
			tenantId: '-1',
			branchName: 'Default Branch',
			branchCode: 'BR001',
			addressLine1: '123 Main Street',
			city: 'Lilongwe',
			district: 'Lilongwe Urban',
			phoneNumber: '+265999000111',
			email: 'branch@example.com',
			currencySymbol: 'K',
			currencyCode: 'MKW',
			taxRate: 0.0,
			chargeTax: false,
			status: 'active',
			isActive: true,
			isVirtualWarehouse: false,
			synced: false,
			mraApprovalStatus: 'PENDING',
			createdAt: now,
			updatedAt: now,
		};

		await sealDBModel.insert(BRANCHES_TABLE, defaultBranch);
		console.log('✅ Default branch created successfully.');
	} catch (err) {
		console.error('❌ Error creating default branch:', err);
	}
};

const checkOrCreateDefaultTerminal = async () => {
	try {
		const terminal = await sealDBModel.findById(TERMINALS_TABLE, { terminalId: '-1' });
		if (terminal) return;

		const defaultTerminal: Terminal = {
			terminalId: '-1',
			tenantId: '-1',
			branchId: '-1',
			mraTerminalId: null,
			terminalCode: 'TERM001',
			terminalLabel: 'Main Terminal',
			terminalPosition: 1,
			deviceId: 'DEFAULT_DEVICE',
			osName: 'Linux',
			osVersion: '1.0',
			osBuild: 'build-001',
			macAddress: '00:00:00:00:00:00',
			posProductId: 'POS001',
			posProductVersion: '1.0.0',
			terminalConfigVersion: 1,
			offlineMaxTransactionAgeHours: 24,
			offlineMaxCumulativeAmount: 100000,
			activationCode: 'DEFAULT',
			activationStatus: 'ACTIVATED',
			activationDate: new Date(),
			isPrimary: true,
			isBlocked: false,
			blockingReason: null,
			blockedAt: null,
			mraApplicationStatus: 'APPROVED',
			mraApprovalDate: new Date(),
			lastActivity: new Date(),
			lastSync: new Date(),
			lastSyncTimestamp: new Date(),
			synced: 0,
			registeredAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await sealDBModel.insert(TERMINALS_TABLE, defaultTerminal);
		console.log('✅ Default terminal created successfully.');
	} catch (err) {
		console.error('❌ Error creating default terminal:', err);
	}
};

const checkOrCreateDefaultSubscriptionPlans = async () => {
	try {
		const plans: Array<SubscriptionPlan> = [
			{
				planId: uuidv4(),
				name: 'BASIC',
				displayName: 'Basic (Free)',
				description: 'Best for small shops that prefer full offline functionality — no cloud or MRA link.',
				monthlyPrice: 0,
				yearlyPrice: 0,
				color: 'gray',
				maxBranches: 1,
				isActive: true,
				features: [
					{ name: 'Terminals', included: true },
					{ name: 'Basic Inventory Management', included: true },
					{ name: 'Sales Reports', included: true },
					{ name: 'Customer Management', included: true },
					{ name: 'Offline Access', included: true },
					{ name: 'Cloud Backup', included: false },
					{ name: 'MRA Integration', included: false },
					{ name: 'Multiple Locations', included: false },
					{ name: 'Advanced Analytics', included: false },
					{ name: 'API Access', included: false },
					{ name: 'Custom Branding', included: false },
					{ name: 'Email Support', included: false },
				],
				limits: {
					terminals: 1,
					users: 1,
					products: 500,
					storage: 'Local Only',
				},
				notes: 'Completely free and works offline. Cloud or MRA integration available when you upgrade.',
			},
			{
				planId: uuidv4(),
				name: 'STANDARD',
				displayName: 'Standard',
				description: 'For businesses that need cloud sync, remote access, and automatic backups.',
				monthlyPrice: 14000,
				yearlyPrice: 140000,
				color: 'blue',
				popular: true,
				maxBranches: 4,
				isActive: true,
				features: [
					{ name: 'Terminals', included: true },
					{ name: 'Basic Inventory Management', included: true },
					{ name: 'Sales Reports', included: true },
					{ name: 'Customer Management', included: true },
					{ name: 'Offline Access', included: true },
					{ name: 'Cloud Backup', included: true },
					{ name: 'MRA Integration', included: false },
					{ name: 'Multiple Locations', included: false },
					{ name: 'Advanced Analytics', included: false },
					{ name: 'API Access', included: false },
					{ name: 'Custom Branding', included: false },
					{ name: 'Email Support', included: true },
				],
				limits: {
					terminals: 1,
					users: 2,
					products: 2000,
					storage: '5GB Cloud',
				},
				notes: 'Includes cloud hosting and sync support for MK10,000/month. Data is backed up securely online.',
			},
			{
				planId: uuidv4(),
				name: 'PREMIUM',
				displayName: 'Premium',
				description: 'Connects your POS to the Malawi Revenue Authority for automated compliance reporting.',
				monthlyPrice: 35000,
				yearlyPrice: 350000,
				color: 'green',
				maxBranches: 10,
				isActive: true,
				features: [
					{ name: 'Terminals', included: true },
					{ name: 'Advanced Inventory Management', included: true },
					{ name: 'Detailed Sales Analytics', included: true },
					{ name: 'Customer Loyalty Program', included: true },
					{ name: 'Offline Access', included: true },
					{ name: 'Cloud Backup', included: true },
					{ name: 'MRA Integration', included: true },
					{ name: 'Multiple Locations', included: true },
					{ name: 'API Access', included: true },
					{ name: 'Custom Branding', included: true },
					{ name: 'Email & Phone Support', included: true },
				],
				limits: {
					terminals: 3,
					users: 5,
					products: 5000,
					storage: '20GB Cloud',
				},
				notes: 'Integrates directly with MRA and includes full cloud hosting for MK35,000/month.',
			},
		];

		for (const plan of plans) {
			const existing = await sealDBModel.findById(
				SUBSCRIPTION_PLANS_TABLE,
				{ name: plan.name }
			);
			if (!existing) {
				await sealDBModel.insert(SUBSCRIPTION_PLANS_TABLE, plan);
			}
		}
	} catch (err) {
		console.error('Error creating default subscription plans:', err);
	}
};

const checkOrCreateDefaultTenantSubscriptions = async () => {
	try {
		const subscription = await sealDBModel.findById(
			TENANT_SUBSCRIPTIONS_TABLE,
			{ subscriptionId: '-1' }
		);
		if (subscription) return;

		const defaultSubscription: TenantSubscription = {
			subscriptionId: '-1',
			tenantId: '-1',
			planId: 'basic-monthly',
			planName: 'basic',
			status: 'active',
			billingCycle: 'monthly',
			referenceNumber: uuidv4(),
			maxBranches: 5,
			startsAt: new Date().toISOString(),
			endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
			autoRenew: true,
			paymentMethod: 'trial',
			synced: 0,
			lastPaymentDate: new Date().toISOString(),
			nextPaymentDate: new Date(
				Date.now() + 30 * 24 * 60 * 60 * 1000
			).toISOString(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await sealDBModel.insert(TENANT_SUBSCRIPTIONS_TABLE, defaultSubscription);
	} catch (err) {
		console.error('Error creating default client subscription:', err);
	}
};

const checkOrCreateDefaultUser = async () => {
	try {
		const saltRounds = 10;
		const user = await sealDBModel.findById(USERS_DB, '-1');

		if (user) return;

		const hash = await bcrypt.hash('admin', saltRounds);

		const adminUser: User = {
			userId: '-1',
			username: 'admin',
			fullname: 'Zonse247 Admin',
			password: hash,
			tenantId: '-1',
			branchId: '-1',
			roleId: 'super-admin',
			accessibleShops: ['*'],
			allowedWorkstations: ['*'],
			email: 'zonse247@gmail.com',
			status: 'active',
			synced: 0,
		};

		await sealDBModel.insert(USERS_DB, adminUser);
	} catch (error) {
		console.error(error);
	}
};

const checkOrCreateDefaultCustomer = async () => {
	try {
		const customer = await sealDBModel.findById(CUSTOMERS_DB, { customerId: '-1' });

		if (customer) return;

		const defaultCustomer: Customer = {
			customerId: '-1',
			tenantId: '-1',
			branchId: '-1',
			userId: '-1',
			name: 'Walk in customer',
		};

		await sealDBModel.insert(CUSTOMERS_DB, defaultCustomer);
	} catch (err) {
		console.error(err);
	}
};

async function checkOrCreateDefaultSettings(): Promise<void> {
	try {
		const settings = await sealDBModel.findById(SHOP_SETTINGS_DB, { settingId: '-1' });

		if (settings) return;

		const defaultSettings: TerminalSettings = {
			settingId: '-1',
			tenantId: '-1',
			branchId: '-1',
			terminalId: '-1',
			app: process.env.APP_NAME || '',
			store: 'Main Till',
			addressLine1: '123 Business Street',
			addressLine2: '123 Business Street',
			country: 'Malawi',
			city: 'Lilongwe',
			contact: process.env.APP_CONTACT || '',
			verificationToken: '',
			tenantSignature: '',
			tax: '0.00',
			symbol: 'MK',
			footer: 'Footer',
			status: 'active',
		};

		await sealDBModel.insert(SHOP_SETTINGS_DB, defaultSettings);
	} catch (err) {
		console.error(err);
	}
}

async function checkAndCreateDefaultCategory(): Promise<void> {
	try {
		const category = await sealDBModel.findById(CATEGORIES_DB, { categoryId: '-1' });

		if (category) return;

		const defaultCategory: Category = {
			categoryId: '-1',
			tenantId: '-1',
			branchId: '-1',
			userId: '-1',
			name: 'Consumables',
		};

		await sealDBModel.insert(CATEGORIES_DB, defaultCategory);
	} catch (err) {
		console.error(err);
	}
}

async function checkOrCreateDefaultPaymentMethods(): Promise<void> {
	const DEFAULT_PAYMENT_METHODS: Array<PaymentMethod> = [
		{
			name: 'Cash',
			methodId: '1',
			tenantId: '-1',
			branchId: '-1',
			userId: '-1',
		},
		{
			name: 'Mobile Transfer',
			methodId: '2',
			tenantId: '-1',
			branchId: '-1',
			userId: '-1',
		},
	];

	try {
		const paymentMethod = await sealDBModel.findById(PAYMENT_METHODS_DB, { methodId: '1' });

		if (paymentMethod) return;

		const insertOperations = DEFAULT_PAYMENT_METHODS.map((method) =>
			sealDBModel.insert(PAYMENT_METHODS_DB, method)
		);
		await Promise.all(insertOperations);
	} catch (err) {
		console.error('Failed to setup payment methods:', err);
	}
}

async function checkOrCreateDefaultPaymentServiceProviders(): Promise<void> {
	const p: Array<PaymentServiceProvider> = [
		{
			name: 'Airtel Money',
			providerId: '1',
			tenantId: '-1',
			branchId: '-1',
			userId: '-1',
		},
		{
			name: 'TNM Mpamba',
			providerId: '2',
			tenantId: '-1',
			branchId: '-1',
			userId: '-1',
		},
		{
			name: 'National Bank',
			providerId: '3',
			tenantId: '-1',
			branchId: '-1',
			userId: '-1',
		},
		{
			name: 'FDH',
			providerId: '4',
			tenantId: '-1',
			branchId: '-1',
			userId: '-1',
		},
		{
			name: 'Standard Bank',
			providerId: '5',
			tenantId: '-1',
			branchId: '-1',
			userId: '-1',
		},
	];

	try {
		const psps = await sealDBModel.findById(PAYMENT_SERVICE_PROVIDERS_DB, '-1');

		if (psps) return;

		const insertOperations = p.map((method) =>
			sealDBModel.insert(PAYMENT_SERVICE_PROVIDERS_DB, method)
		);
		await Promise.all(insertOperations);
	} catch (err) {
		console.error('Failed to setup payment methods:', err);
	}
}

const seedDatabase = async () => {
	try {
		checkOrCreateDefaultRoles();
		checkOrCreateDefaultPermissions();
		checkOrCreateDefaultRolePermissions();
		checkOrCreateDefaultBranch();
		checkOrCreateDefaultTenant();
		checkOrCreateDefaultTerminal();
		checkOrCreateDefaultSubscriptionPlans();
		checkOrCreateDefaultTenantSubscriptions();

		checkOrCreateDefaultUser();
		checkOrCreateDefaultCustomer();
		checkAndCreateDefaultCategory();
		checkOrCreateDefaultPaymentMethods();
		checkOrCreateDefaultPaymentServiceProviders();
		checkOrCreateDefaultSettings();

		console.log('Seed migrated successfully');
		return true;
	} catch (error) {
		console.error('Error seeding database:', error);
		return false;
	}
};

export { seedDatabase };
