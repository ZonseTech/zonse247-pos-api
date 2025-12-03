-- CreateTable
CREATE TABLE "MRA_API_CONFIG_TABLE" (
    "config_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "environment" TEXT DEFAULT 'SANDBOX',
    "api_base_url" TEXT NOT NULL,
    "api_key" TEXT,
    "api_secret" TEXT,
    "last_sync_timestamp" DATETIME,
    "sync_status" TEXT DEFAULT 'SUCCESS',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MRA_API_CONFIG_TABLE_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "log_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "user_id" TEXT,
    "terminal_id" TEXT,
    "action_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_name" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "changes_summary" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_method" TEXT,
    "request_url" TEXT,
    "description" TEXT,
    "synced" INTEGER DEFAULT 0,
    "severity" TEXT DEFAULT 'low',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "audit_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "audit_logs_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "branch_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branch_setting_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT NOT NULL,
    "app" TEXT,
    "store" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "country" TEXT,
    "city" TEXT,
    "contact" TEXT,
    "tax" TEXT,
    "symbol" TEXT,
    "footer" TEXT,
    "status" TEXT DEFAULT 'inactive',
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "branch_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "branches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "site_id" TEXT,
    "site_name" TEXT,
    "description" TEXT,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "address_line_3" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "currency_code" TEXT DEFAULT 'MKW',
    "currency_symbol" TEXT DEFAULT 'K',
    "tax_rate" DECIMAL DEFAULT 0.00,
    "charge_tax" BOOLEAN DEFAULT false,
    "receipt_footer" TEXT,
    "logo_url" TEXT,
    "is_virtual_warehouse" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "synced" INTEGER DEFAULT 0,
    "mra_approval_status" TEXT DEFAULT 'PENDING',
    "mra_approval_date" DATETIME,
    "status" TEXT DEFAULT 'active',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "item_count" INTEGER,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "customers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT,
    "barcode" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "unit" TEXT DEFAULT 'piece',
    "cost_price" DECIMAL NOT NULL DEFAULT 0.00,
    "sell_price" DECIMAL NOT NULL DEFAULT 0.00,
    "promo_price" DECIMAL,
    "promo_start" DATETIME,
    "promo_end" DATETIME,
    "quantity" TEXT DEFAULT '0',
    "reserved_quantity" INTEGER DEFAULT 0,
    "min_stock" INTEGER DEFAULT 0,
    "original_quantity" TEXT DEFAULT '0',
    "max_stock" INTEGER,
    "stock" INTEGER,
    "reorder_level" INTEGER,
    "weight" DECIMAL,
    "dimensions" TEXT,
    "color" TEXT,
    "size" TEXT,
    "status" TEXT DEFAULT 'active',
    "track_inventory" BOOLEAN DEFAULT true,
    "allow_negative_stock" BOOLEAN DEFAULT false,
    "is_taxable" BOOLEAN DEFAULT true,
    "expiration_date" DATETIME,
    "manufacture_date" DATETIME,
    "image_urls" JSONB,
    "supplier_name" TEXT,
    "supplier_code" TEXT,
    "created_by" TEXT,
    "last_updated_by" TEXT,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "inventory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "inventory_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "inventory_last_updated_by_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" TEXT NOT NULL,
    "ref_number" TEXT NOT NULL,
    "transaction_id" TEXT DEFAULT '1',
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1.000,
    "purchase_price" DECIMAL NOT NULL DEFAULT 0.00,
    "sell_price" DECIMAL NOT NULL DEFAULT 0.00,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "method_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "icon" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_methods_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "permission_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "scope" TEXT DEFAULT 'shop',
    "synced" INTEGER DEFAULT 0,
    "is_system_permission" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "plan_features" (
    "feature_category_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "display_order" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role_permission_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("permission_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "roles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "synced" INTEGER DEFAULT 0,
    "is_system_role" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "service_provider" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_provider_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "subscription_plan_id" TEXT NOT NULL PRIMARY KEY,
    "plan_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthly_price" DECIMAL NOT NULL DEFAULT 0.00,
    "yearly_price" DECIMAL NOT NULL DEFAULT 0.00,
    "color" TEXT NOT NULL DEFAULT 'gray',
    "is_popular" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "features" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "notes" TEXT,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "tenant_subscription_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "subscription_plan_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'active',
    "starts_at" DATETIME NOT NULL,
    "ends_at" DATETIME,
    "auto_renew" BOOLEAN DEFAULT true,
    "payment_method" TEXT,
    "max_shops" INTEGER DEFAULT 1,
    "synced" INTEGER DEFAULT 0,
    "last_payment_date" DATETIME,
    "next_payment_date" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "tenant_subscriptions_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans" ("subscription_plan_id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenant_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "tin" TEXT NOT NULL,
    "tenant_code" TEXT NOT NULL,
    "business_type" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mra_portal_username" TEXT,
    "trading_name" TEXT,
    "is_vat_registered" BOOLEAN DEFAULT false,
    "tax_office_code" TEXT,
    "msonkho_online_status" TEXT DEFAULT 'PENDING',
    "subscription_plan" TEXT,
    "subscription_status" TEXT DEFAULT 'TRIAL',
    "owner_name" TEXT NOT NULL,
    "address" TEXT,
    "country" TEXT,
    "trial_ends_at" DATETIME,
    "auth_key" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "registered_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "activated_at" DATETIME,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "terminals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "terminal_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "mra_terminal_id" TEXT,
    "terminal_code" TEXT NOT NULL,
    "terminal_label" TEXT NOT NULL,
    "terminal_position" INTEGER,
    "device_id" TEXT,
    "os_name" TEXT,
    "os_version" TEXT,
    "os_build" TEXT,
    "mac_address" TEXT,
    "pos_product_id" TEXT,
    "pos_product_version" TEXT,
    "terminal_config_version" DECIMAL,
    "offline_max_transaction_age_hours" DECIMAL,
    "offline_max_cumulative_amount" DECIMAL,
    "activation_code" TEXT,
    "activation_status" TEXT DEFAULT 'PENDING',
    "activation_date" DATETIME,
    "is_primary" BOOLEAN DEFAULT false,
    "is_blocked" BOOLEAN DEFAULT false,
    "blocking_reason" TEXT,
    "blocked_at" DATETIME,
    "mra_application_status" TEXT DEFAULT 'APPLIED',
    "mra_approval_date" DATETIME,
    "last_activity" DATETIME,
    "last_sync" DATETIME,
    "last_sync_timestamp" DATETIME,
    "synced" INTEGER DEFAULT 0,
    "registered_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "terminals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "terminals_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_id" TEXT NOT NULL,
    "ref_number" TEXT NOT NULL,
    "discount" DECIMAL DEFAULT 0.00,
    "customer_id" TEXT,
    "subtotal" DECIMAL DEFAULT 0.00,
    "tax" DECIMAL DEFAULT 0.00,
    "date" DATETIME,
    "payment_method_id" TEXT,
    "phone_number" TEXT,
    "payment_service_provider_id" TEXT,
    "total" DECIMAL DEFAULT 0.00,
    "paid" DECIMAL DEFAULT 0.00,
    "change_amount" DECIMAL DEFAULT 0.00,
    "terminal_id" TEXT,
    "user_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "status" TEXT,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_permission_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "granted" BOOLEAN NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "synced" INTEGER DEFAULT 0,
    CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("permission_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "user_permissions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "user_permissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "terminal_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "started_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "last_activity" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "ended_at" DATETIME,
    "synced" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "user_sessions_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'active',
    "accessible_shops" JSONB,
    "allowed_workstations" JSONB,
    "max_discount_percent" DECIMAL DEFAULT 0.00,
    "can_override_prices" BOOLEAN DEFAULT false,
    "pin_code" TEXT,
    "current_branch_id" TEXT,
    "last_login" DATETIME,
    "last_logout" DATETIME,
    "password_changed_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "force_password_change" BOOLEAN DEFAULT false,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "users_current_branch_id_fkey" FOREIGN KEY ("current_branch_id") REFERENCES "branches" ("branch_id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "SyncStatus" (
    "tableName" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "lastSyncAt" DATETIME NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payment_service_providers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "synced" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "MRA_API_CONFIG_TABLE_tenant_id_environment_key" ON "MRA_API_CONFIG_TABLE"("tenant_id", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_log_id_key" ON "audit_logs"("log_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs"("action_type");

-- CreateIndex
CREATE INDEX "audit_logs_branch_id_idx" ON "audit_logs"("branch_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_branch_id_idx" ON "audit_logs"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_terminal_id_idx" ON "audit_logs"("terminal_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_settings_branch_setting_id_key" ON "branch_settings"("branch_setting_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_settings_branch_id_key" ON "branch_settings"("branch_id");

-- CreateIndex
CREATE INDEX "branch_settings_branch_id_idx" ON "branch_settings"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_branch_id_key" ON "branches"("branch_id");

-- CreateIndex
CREATE INDEX "branches_branch_code_idx" ON "branches"("branch_code");

-- CreateIndex
CREATE INDEX "branches_tenant_id_is_active_idx" ON "branches"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenant_id_branch_code_key" ON "branches"("tenant_id", "branch_code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_category_id_key" ON "categories"("category_id");

-- CreateIndex
CREATE INDEX "categories_branch_id_idx" ON "categories"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_branch_id_name_key" ON "categories"("branch_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_id_key" ON "customers"("customer_id");

-- CreateIndex
CREATE INDEX "customers_branch_id_idx" ON "customers"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_product_id_key" ON "inventory"("product_id");

-- CreateIndex
CREATE INDEX "inventory_created_by_idx" ON "inventory"("created_by");

-- CreateIndex
CREATE INDEX "inventory_barcode_idx" ON "inventory"("barcode");

-- CreateIndex
CREATE INDEX "inventory_branch_id_idx" ON "inventory"("branch_id");

-- CreateIndex
CREATE INDEX "inventory_category_id_idx" ON "inventory"("category_id");

-- CreateIndex
CREATE INDEX "inventory_name_idx" ON "inventory"("name");

-- CreateIndex
CREATE INDEX "inventory_status_idx" ON "inventory"("status");

-- CreateIndex
CREATE INDEX "inventory_last_updated_by_idx" ON "inventory"("last_updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_id_key" ON "orders"("order_id");

-- CreateIndex
CREATE INDEX "orders_transaction_id_idx" ON "orders"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_method_id_key" ON "payment_methods"("method_id");

-- CreateIndex
CREATE INDEX "payment_methods_branch_id_idx" ON "payment_methods"("branch_id");

-- CreateIndex
CREATE INDEX "payment_methods_tenant_id_idx" ON "payment_methods"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_methods_user_id_idx" ON "payment_methods"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_branch_id_name_key" ON "payment_methods"("branch_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_tenant_id_name_key" ON "payment_methods"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_user_id_name_key" ON "payment_methods"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_permission_id_key" ON "permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_category_idx" ON "permissions"("category");

-- CreateIndex
CREATE INDEX "permissions_name_idx" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_scope_idx" ON "permissions"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" ON "role_permissions"("role_permission_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_id_key" ON "roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "idx_active_role" ON "roles"("is_active");

-- CreateIndex
CREATE INDEX "idx_role_name" ON "roles"("name");

-- CreateIndex
CREATE INDEX "idx_system_role" ON "roles"("is_system_role");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_provider_id_key" ON "service_provider"("provider_id");

-- CreateIndex
CREATE INDEX "service_provider_branch_id_idx" ON "service_provider"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_branch_id_name_key" ON "service_provider"("branch_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_plan_code_key" ON "subscription_plans"("plan_code");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_subscription_plan_id_idx" ON "tenant_subscriptions"("subscription_plan_id");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_tenant_id_idx" ON "tenant_subscriptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_tenant_id_key" ON "tenants"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_tin_key" ON "tenants"("tin");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_tenant_code_key" ON "tenants"("tenant_code");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_auth_key_key" ON "tenants"("auth_key");

-- CreateIndex
CREATE INDEX "tenants_auth_key_idx" ON "tenants"("auth_key");

-- CreateIndex
CREATE INDEX "tenants_email_idx" ON "tenants"("email");

-- CreateIndex
CREATE INDEX "tenants_subscription_status_idx" ON "tenants"("subscription_status");

-- CreateIndex
CREATE INDEX "tenants_tenant_code_idx" ON "tenants"("tenant_code");

-- CreateIndex
CREATE INDEX "tenants_tin_idx" ON "tenants"("tin");

-- CreateIndex
CREATE UNIQUE INDEX "terminals_terminal_id_key" ON "terminals"("terminal_id");

-- CreateIndex
CREATE UNIQUE INDEX "terminals_mra_terminal_id_key" ON "terminals"("mra_terminal_id");

-- CreateIndex
CREATE UNIQUE INDEX "terminals_terminal_code_key" ON "terminals"("terminal_code");

-- CreateIndex
CREATE INDEX "terminals_activation_status_idx" ON "terminals"("activation_status");

-- CreateIndex
CREATE INDEX "terminals_branch_id_idx" ON "terminals"("branch_id");

-- CreateIndex
CREATE INDEX "terminals_tenant_id_branch_id_idx" ON "terminals"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "terminals_tenant_id_idx" ON "terminals"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transaction_id_key" ON "transactions"("transaction_id");

-- CreateIndex
CREATE INDEX "transactions_branch_id_idx" ON "transactions"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_permission_id_key" ON "user_permissions"("user_permission_id");

-- CreateIndex
CREATE INDEX "user_permissions_created_by_idx" ON "user_permissions"("created_by");

-- CreateIndex
CREATE INDEX "user_permissions_branch_id_idx" ON "user_permissions"("branch_id");

-- CreateIndex
CREATE INDEX "user_permissions_permission_id_idx" ON "user_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_permission_id_branch_id_key" ON "user_permissions"("user_id", "permission_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_user_session_id_key" ON "user_sessions"("user_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "user_sessions_session_token_idx" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "user_sessions_terminal_id_idx" ON "user_sessions"("terminal_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");

-- CreateIndex
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");

-- CreateIndex
CREATE INDEX "users_current_branch_id_idx" ON "users"("current_branch_id");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_username_key" ON "users"("tenant_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "payment_service_providers_providerId_key" ON "payment_service_providers"("providerId");
