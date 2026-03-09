/**
 * Migration: 20260306_03
 * Description: Remove legacy synced column from all tables
 * 
 * The `synced` flag is incompatible with multi-terminal sync where changes can originate
 * from any terminal. The new sync system uses:
 * - `updatedAt` for delta sync queries
 * - `version` for optimistic locking / conflict detection
 * - `deletedAt` for soft deletes
 * - `terminalId` for origin tracking
 * 
 * This migration removes the legacy `synced` column from all tables that have it.
 * 
 * For MySQL: Simple ALTER TABLE DROP COLUMN
 * For SQLite: Table recreation (SQLite doesn't support DROP COLUMN)
 */

import { Migration } from '../migration.types';

// ============================================
// MySQL: Simple DROP COLUMN statements
// ============================================
const mysqlStatements = [
    `ALTER TABLE \`audit_logs\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`branch_settings\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`branches\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`categories\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`customers\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`inventory_old\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`orders\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`return_items\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`payment_methods\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`permissions\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`role_permissions\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`roles\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`service_provider\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`subscription_plans\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`branch_subscriptions\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`tenants\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`terminals\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`transactions\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`user_permissions\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`user_sessions\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`users\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`payment_service_providers\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`parked_sales\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`printers\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`sale_payments\` DROP COLUMN \`synced\``,
    `ALTER TABLE \`staff\` DROP COLUMN \`synced\``,
];

// ============================================
// SQLite: Table recreation (drop and recreate without synced column)
// For each table, we SELECT all columns EXCEPT synced into a new table,
// then drop the old table, rename the new one, and recreate indexes.
// ============================================

// Define columns for each table (excluding synced)
// This creates the SELECT statement for data migration

const sqliteStatements: string[] = [
    // Disable foreign key checks during migration
    `PRAGMA foreign_keys=OFF`,

    // ========== audit_logs ==========
    `CREATE TABLE "audit_logs_new" AS SELECT id, log_id, tenant_id, branch_id, user_id, terminal_id, action_type, entity_type, entity_id, entity_name, old_values, new_values, changes_summary, ip_address, user_agent, request_method, request_url, description, severity, created_at FROM "audit_logs"`,
    `DROP TABLE "audit_logs"`,
    `ALTER TABLE "audit_logs_new" RENAME TO "audit_logs"`,
    `CREATE UNIQUE INDEX "audit_logs_log_id_key" ON "audit_logs"("log_id")`,
    `CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs"("action_type")`,
    `CREATE INDEX "audit_logs_branch_id_idx" ON "audit_logs"("branch_id")`,
    `CREATE INDEX "audit_logs_tenant_id_branch_id_idx" ON "audit_logs"("tenant_id", "branch_id")`,
    `CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id")`,
    `CREATE INDEX "audit_logs_terminal_id_idx" ON "audit_logs"("terminal_id")`,
    `CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id")`,

    // ========== branch_settings ==========
    `CREATE TABLE "branch_settings_new" AS SELECT id, branch_setting_id, tenant_id, branch_id, terminal_id, app, store, address_line1, address_line2, country, city, contact, tax, symbol, footer, status, created_at, updated_at FROM "branch_settings"`,
    `DROP TABLE "branch_settings"`,
    `ALTER TABLE "branch_settings_new" RENAME TO "branch_settings"`,
    `CREATE UNIQUE INDEX "branch_settings_branch_setting_id_key" ON "branch_settings"("branch_setting_id")`,
    `CREATE UNIQUE INDEX "branch_settings_branch_id_key" ON "branch_settings"("branch_id")`,
    `CREATE INDEX "branch_settings_branch_id_idx" ON "branch_settings"("branch_id")`,

    // ========== branches ==========
    `CREATE TABLE "branches_new" AS SELECT id, branch_id, tenant_id, branch_name, branch_code, site_id, site_name, description, address_line_1, address_line_2, address_line_3, district_id, location, business_type, city, state, postal_code, phone_number, email, currency_code, currency_symbol, tax_rate, charge_tax, receipt_footer, logo_url, is_virtual_warehouse, is_active, mra_approval_status, mra_approval_date, branch_subscription_id, status, created_at, updated_at FROM "branches"`,
    `DROP TABLE "branches"`,
    `ALTER TABLE "branches_new" RENAME TO "branches"`,
    `CREATE UNIQUE INDEX "branches_branch_id_key" ON "branches"("branch_id")`,
    `CREATE UNIQUE INDEX "branches_branch_subscription_id_key" ON "branches"("branch_subscription_id")`,
    `CREATE UNIQUE INDEX "unique_tenant_branch_code" ON "branches"("tenant_id", "branch_code")`,
    `CREATE INDEX "branches_branch_code_idx" ON "branches"("branch_code")`,
    `CREATE INDEX "branches_tenant_id_is_active_idx" ON "branches"("tenant_id", "is_active")`,
    `CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id")`,

    // ========== categories ==========
    `CREATE TABLE "categories_new" AS SELECT id, category_id, branch_id, tenant_id, user_id, terminal_id, name, description, color, is_active, is_default, sort_order, item_count, last_synced_at, version, deleted_at, created_at, updated_at FROM "categories"`,
    `DROP TABLE "categories"`,
    `ALTER TABLE "categories_new" RENAME TO "categories"`,
    `CREATE UNIQUE INDEX "categories_category_id_key" ON "categories"("category_id")`,
    `CREATE UNIQUE INDEX "unique_branch_category" ON "categories"("branch_id", "name")`,
    `CREATE INDEX "categories_branch_id_idx" ON "categories"("branch_id")`,
    `CREATE INDEX "categories_terminal_id_idx" ON "categories"("terminal_id")`,
    `CREATE INDEX "categories_is_default_idx" ON "categories"("is_default")`,
    `CREATE INDEX "categories_tenant_id_branch_id_updated_at_idx" ON "categories"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "categories_updated_at_idx" ON "categories"("updated_at")`,
    `CREATE INDEX "categories_deleted_at_idx" ON "categories"("deleted_at")`,

    // ========== customers ==========
    `CREATE TABLE "customers_new" AS SELECT id, customer_id, tenant_id, branch_id, terminal_id, user_id, name, phone, email, address, is_default, last_synced_at, version, deleted_at, created_at, updated_at FROM "customers"`,
    `DROP TABLE "customers"`,
    `ALTER TABLE "customers_new" RENAME TO "customers"`,
    `CREATE UNIQUE INDEX "customers_customer_id_key" ON "customers"("customer_id")`,
    `CREATE INDEX "customers_branch_id_idx" ON "customers"("branch_id")`,
    `CREATE INDEX "customers_is_default_idx" ON "customers"("is_default")`,
    `CREATE INDEX "customers_tenant_id_branch_id_updated_at_idx" ON "customers"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "customers_updated_at_idx" ON "customers"("updated_at")`,
    `CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at")`,

    // ========== inventory_old ==========
    `CREATE TABLE "inventory_old_new" AS SELECT id, product_id, branch_id, tenant_id, user_id, category_id, barcode, sku, name, description, brand, unit, cost_price, sell_price, promo_price, promo_start, promo_end, quantity, reserved_quantity, min_stock, original_quantity, max_stock, stock, reorder_level, weight, dimensions, color, size, properties, status, track_inventory, allow_negative_stock, is_taxable, expiration_date, manufacture_date, image_urls, supplier_name, supplier_code, created_by, last_updated_by, created_at, updated_at FROM "inventory_old"`,
    `DROP TABLE "inventory_old"`,
    `ALTER TABLE "inventory_old_new" RENAME TO "inventory_old"`,
    `CREATE UNIQUE INDEX "inventory_old_product_id_key" ON "inventory_old"("product_id")`,
    `CREATE INDEX "inventory_old_created_by_idx" ON "inventory_old"("created_by")`,
    `CREATE INDEX "inventory_old_barcode_idx" ON "inventory_old"("barcode")`,
    `CREATE INDEX "inventory_old_branch_id_idx" ON "inventory_old"("branch_id")`,
    `CREATE INDEX "inventory_old_category_id_idx" ON "inventory_old"("category_id")`,
    `CREATE INDEX "inventory_old_name_idx" ON "inventory_old"("name")`,
    `CREATE INDEX "inventory_old_status_idx" ON "inventory_old"("status")`,
    `CREATE INDEX "inventory_old_last_updated_by_idx" ON "inventory_old"("last_updated_by")`,

    // ========== orders ==========
    `CREATE TABLE "orders_new" AS SELECT id, order_id, ref_number, transaction_id, product_id, quantity, purchase_price, sell_price, created_at, updated_at FROM "orders"`,
    `DROP TABLE "orders"`,
    `ALTER TABLE "orders_new" RENAME TO "orders"`,
    `CREATE UNIQUE INDEX "orders_order_id_key" ON "orders"("order_id")`,
    `CREATE INDEX "orders_transaction_id_idx" ON "orders"("transaction_id")`,

    // ========== return_items ==========
    `CREATE TABLE "return_items_new" AS SELECT id, return_item_id, return_transaction_id, original_order_id, product_id, returned_quantity, original_quantity, return_price, return_reason, restock_status, restocked_quantity, restocked_at, condition, notes, created_at, updated_at FROM "return_items"`,
    `DROP TABLE "return_items"`,
    `ALTER TABLE "return_items_new" RENAME TO "return_items"`,
    `CREATE UNIQUE INDEX "return_items_return_item_id_key" ON "return_items"("return_item_id")`,
    `CREATE INDEX "return_items_return_transaction_id_idx" ON "return_items"("return_transaction_id")`,
    `CREATE INDEX "return_items_original_order_id_idx" ON "return_items"("original_order_id")`,
    `CREATE INDEX "return_items_product_id_idx" ON "return_items"("product_id")`,

    // ========== payment_methods ==========
    `CREATE TABLE "payment_methods_new" AS SELECT id, method_id, terminal_id, name, is_active, icon, sort_order, last_synced_at, version, deleted_at, created_at, updated_at FROM "payment_methods"`,
    `DROP TABLE "payment_methods"`,
    `ALTER TABLE "payment_methods_new" RENAME TO "payment_methods"`,
    `CREATE UNIQUE INDEX "payment_methods_method_id_key" ON "payment_methods"("method_id")`,
    `CREATE INDEX "payment_methods_updated_at_idx" ON "payment_methods"("updated_at")`,
    `CREATE INDEX "payment_methods_deleted_at_idx" ON "payment_methods"("deleted_at")`,

    // ========== permissions ==========
    `CREATE TABLE "permissions_new" AS SELECT id, permission_id, name, display_name, description, category, scope, is_system_permission, created_at, updated_at FROM "permissions"`,
    `DROP TABLE "permissions"`,
    `ALTER TABLE "permissions_new" RENAME TO "permissions"`,
    `CREATE UNIQUE INDEX "permissions_permission_id_key" ON "permissions"("permission_id")`,
    `CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name")`,
    `CREATE INDEX "permissions_category_idx" ON "permissions"("category")`,
    `CREATE INDEX "permissions_name_idx" ON "permissions"("name")`,
    `CREATE INDEX "permissions_scope_idx" ON "permissions"("scope")`,

    // ========== role_permissions ==========
    `CREATE TABLE "role_permissions_new" AS SELECT id, role_permission_id, role_id, permission_id, created_at, updated_at FROM "role_permissions"`,
    `DROP TABLE "role_permissions"`,
    `ALTER TABLE "role_permissions_new" RENAME TO "role_permissions"`,
    `CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" ON "role_permissions"("role_permission_id")`,
    `CREATE UNIQUE INDEX "unique_role_permission" ON "role_permissions"("role_id", "permission_id")`,
    `CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id")`,
    `CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id")`,

    // ========== roles ==========
    `CREATE TABLE "roles_new" AS SELECT id, role_id, name, display_name, description, is_system_role, is_active, created_at, updated_at FROM "roles"`,
    `DROP TABLE "roles"`,
    `ALTER TABLE "roles_new" RENAME TO "roles"`,
    `CREATE UNIQUE INDEX "roles_role_id_key" ON "roles"("role_id")`,
    `CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name")`,
    `CREATE INDEX "idx_active_role" ON "roles"("is_active")`,
    `CREATE INDEX "idx_role_name" ON "roles"("name")`,
    `CREATE INDEX "idx_system_role" ON "roles"("is_system_role")`,

    // ========== service_provider ==========
    `CREATE TABLE "service_provider_new" AS SELECT id, provider_id, branch_id, tenant_id, user_id, name, description, logoUrl, is_active, sort_order, created_at, updated_at FROM "service_provider"`,
    `DROP TABLE "service_provider"`,
    `ALTER TABLE "service_provider_new" RENAME TO "service_provider"`,
    `CREATE UNIQUE INDEX "service_provider_provider_id_key" ON "service_provider"("provider_id")`,
    `CREATE UNIQUE INDEX "unique_branch_service_provider" ON "service_provider"("branch_id", "name")`,
    `CREATE INDEX "service_provider_branch_id_idx" ON "service_provider"("branch_id")`,

    // ========== subscription_plans ==========
    `CREATE TABLE "subscription_plans_new" AS SELECT subscription_plan_id, plan_code, name, description, monthly_price, yearly_price, color, is_popular, is_active, features, limits, notes, created_at, updated_at FROM "subscription_plans"`,
    `DROP TABLE "subscription_plans"`,
    `ALTER TABLE "subscription_plans_new" RENAME TO "subscription_plans"`,
    `CREATE UNIQUE INDEX "subscription_plans_plan_code_key" ON "subscription_plans"("plan_code")`,

    // ========== branch_subscriptions ==========
    `CREATE TABLE "branch_subscriptions_new" AS SELECT branch_subscription_id, subscription_plan_id, status, starts_at, ends_at, auto_renew, payment_method, last_payment_date, next_payment_date, created_at, updated_at FROM "branch_subscriptions"`,
    `DROP TABLE "branch_subscriptions"`,
    `ALTER TABLE "branch_subscriptions_new" RENAME TO "branch_subscriptions"`,
    `CREATE INDEX "branch_subscriptions_subscription_plan_id_idx" ON "branch_subscriptions"("subscription_plan_id")`,

    // ========== tenants ==========
    `CREATE TABLE "tenants_new" AS SELECT id, tenant_id, business_name, tin, tenant_code, business_type, phone_number, email, mra_portal_username, trading_name, is_vat_registered, tax_office_code, msonkho_online_status, verification_token, owner_name, address, country, status, registered_at, activated_at, created_at, updated_at FROM "tenants"`,
    `DROP TABLE "tenants"`,
    `ALTER TABLE "tenants_new" RENAME TO "tenants"`,
    `CREATE UNIQUE INDEX "tenants_tenant_id_key" ON "tenants"("tenant_id")`,
    `CREATE UNIQUE INDEX "tenants_tin_key" ON "tenants"("tin")`,
    `CREATE UNIQUE INDEX "tenants_tenant_code_key" ON "tenants"("tenant_code")`,
    `CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email")`,
    `CREATE INDEX "tenants_email_idx" ON "tenants"("email")`,
    `CREATE INDEX "tenants_tenant_code_idx" ON "tenants"("tenant_code")`,
    `CREATE INDEX "tenants_tin_idx" ON "tenants"("tin")`,

    // ========== terminals ==========
    `CREATE TABLE "terminals_new" AS SELECT id, terminal_id, tenant_id, branch_id, mra_terminal_id, terminal_code, terminal_label, terminal_position, device_id, os_name, os_version, os_build, mac_address, pos_product_id, pos_product_version, terminal_config_version, offline_max_transaction_age_hours, offline_max_cumulative_amount, activation_code, activation_status, activation_date, is_primary, is_blocked, blocking_reason, blocked_at, mra_application_status, mra_approval_date, last_activity, last_sync, last_sync_timestamp, last_sync_at, last_seen_at, last_synced_at, registered_at, version, deleted_at, created_at, updated_at FROM "terminals"`,
    `DROP TABLE "terminals"`,
    `ALTER TABLE "terminals_new" RENAME TO "terminals"`,
    `CREATE UNIQUE INDEX "terminals_terminal_id_key" ON "terminals"("terminal_id")`,
    `CREATE UNIQUE INDEX "terminals_mra_terminal_id_key" ON "terminals"("mra_terminal_id")`,
    `CREATE UNIQUE INDEX "unique_tenant_terminal_code" ON "terminals"("tenant_id", "terminal_code")`,
    `CREATE INDEX "terminals_activation_status_idx" ON "terminals"("activation_status")`,
    `CREATE INDEX "terminals_branch_id_idx" ON "terminals"("branch_id")`,
    `CREATE INDEX "terminals_tenant_id_branch_id_idx" ON "terminals"("tenant_id", "branch_id")`,
    `CREATE INDEX "terminals_tenant_id_idx" ON "terminals"("tenant_id")`,
    `CREATE INDEX "terminals_tenant_id_branch_id_updated_at_idx" ON "terminals"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "terminals_updated_at_idx" ON "terminals"("updated_at")`,
    `CREATE INDEX "terminals_deleted_at_idx" ON "terminals"("deleted_at")`,

    // ========== transactions ==========
    `CREATE TABLE "transactions_new" AS SELECT id, transaction_id, external_transaction_ref, ref_number, discount, customer_id, subtotal, tax, date, payment_method_id, phone_number, payment_service_provider_id, total, paid, change_amount, terminal_id, user_id, tenant_id, branch_id, status, is_refund, original_transaction_id, refund_reason, refunded_amount, refunded_at, created_at, updated_at, sale_id FROM "transactions"`,
    `DROP TABLE "transactions"`,
    `ALTER TABLE "transactions_new" RENAME TO "transactions"`,
    `CREATE UNIQUE INDEX "transactions_transaction_id_key" ON "transactions"("transaction_id")`,
    `CREATE INDEX "transactions_branch_id_idx" ON "transactions"("branch_id")`,
    `CREATE INDEX "transactions_customer_id_idx" ON "transactions"("customer_id")`,
    `CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id")`,
    `CREATE INDEX "transactions_payment_method_id_idx" ON "transactions"("payment_method_id")`,
    `CREATE INDEX "transactions_payment_service_provider_id_idx" ON "transactions"("payment_service_provider_id")`,
    `CREATE INDEX "transactions_terminal_id_idx" ON "transactions"("terminal_id")`,
    `CREATE INDEX "transactions_original_transaction_id_idx" ON "transactions"("original_transaction_id")`,
    `CREATE INDEX "transactions_sale_id_idx" ON "transactions"("sale_id")`,

    // ========== user_permissions ==========
    `CREATE TABLE "user_permissions_new" AS SELECT id, user_permission_id, user_id, permission_id, branch_id, granted, created_at, created_by FROM "user_permissions"`,
    `DROP TABLE "user_permissions"`,
    `ALTER TABLE "user_permissions_new" RENAME TO "user_permissions"`,
    `CREATE UNIQUE INDEX "user_permissions_user_permission_id_key" ON "user_permissions"("user_permission_id")`,
    `CREATE UNIQUE INDEX "unique_user_permission_branch" ON "user_permissions"("user_id", "permission_id", "branch_id")`,
    `CREATE INDEX "user_permissions_created_by_idx" ON "user_permissions"("created_by")`,
    `CREATE INDEX "user_permissions_branch_id_idx" ON "user_permissions"("branch_id")`,
    `CREATE INDEX "user_permissions_permission_id_idx" ON "user_permissions"("permission_id")`,
    `CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id")`,

    // ========== user_sessions ==========
    `CREATE TABLE "user_sessions_new" AS SELECT id, user_session_id, user_id, terminal_id, session_token, ip_address, user_agent, started_at, last_activity, ended_at, is_active, created_at, updated_at FROM "user_sessions"`,
    `DROP TABLE "user_sessions"`,
    `ALTER TABLE "user_sessions_new" RENAME TO "user_sessions"`,
    `CREATE UNIQUE INDEX "user_sessions_user_session_id_key" ON "user_sessions"("user_session_id")`,
    `CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions"("session_token")`,
    `CREATE INDEX "user_sessions_session_token_idx" ON "user_sessions"("session_token")`,
    `CREATE INDEX "user_sessions_terminal_id_idx" ON "user_sessions"("terminal_id")`,
    `CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id")`,

    // ========== users ==========
    `CREATE TABLE "users_new" AS SELECT id, user_id, tenant_id, branch_id, username, password, fullname, email, phone, role_id, status, accessible_branches, allowed_terminals, max_discount_percent, can_override_prices, pin_code, current_branch_id, last_login, last_logout, password_changed_at, force_password_change, last_synced_at, version, deleted_at, created_at, updated_at FROM "users"`,
    `DROP TABLE "users"`,
    `ALTER TABLE "users_new" RENAME TO "users"`,
    `CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id")`,
    `CREATE UNIQUE INDEX "unique_tenant_username" ON "users"("tenant_id", "username")`,
    `CREATE INDEX "users_branch_id_idx" ON "users"("branch_id")`,
    `CREATE INDEX "users_current_branch_id_idx" ON "users"("current_branch_id")`,
    `CREATE INDEX "users_role_id_idx" ON "users"("role_id")`,
    `CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id")`,
    `CREATE INDEX "users_username_idx" ON "users"("username")`,
    `CREATE INDEX "users_tenant_id_branch_id_updated_at_idx" ON "users"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "users_updated_at_idx" ON "users"("updated_at")`,
    `CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at")`,

    // ========== payment_service_providers ==========
    `CREATE TABLE "payment_service_providers_new" AS SELECT id, providerId, userId, name, type, description, logoUrl, isActive, sortOrder, createdAt, updatedAt FROM "payment_service_providers"`,
    `DROP TABLE "payment_service_providers"`,
    `ALTER TABLE "payment_service_providers_new" RENAME TO "payment_service_providers"`,
    `CREATE UNIQUE INDEX "payment_service_providers_providerId_key" ON "payment_service_providers"("providerId")`,

    // ========== parked_sales ==========
    `CREATE TABLE "parked_sales_new" AS SELECT parked_sale_id, tenant_id, branch_id, user_id, terminal_id, customer_id, reference, subtotal, tax_amount, discount_amount, other_charges, total_amount, total_items, status, notes, parked_at, expires_at, resumed_at, last_synced_at, version, deleted_at, created_at, updated_at FROM "parked_sales"`,
    `DROP TABLE "parked_sales"`,
    `ALTER TABLE "parked_sales_new" RENAME TO "parked_sales"`,
    `CREATE UNIQUE INDEX "parked_sales_reference_key" ON "parked_sales"("reference")`,
    `CREATE INDEX "parked_sales_tenant_id_idx" ON "parked_sales"("tenant_id")`,
    `CREATE INDEX "parked_sales_branch_id_idx" ON "parked_sales"("branch_id")`,
    `CREATE INDEX "parked_sales_user_id_idx" ON "parked_sales"("user_id")`,
    `CREATE INDEX "parked_sales_terminal_id_idx" ON "parked_sales"("terminal_id")`,
    `CREATE INDEX "parked_sales_reference_idx" ON "parked_sales"("reference")`,
    `CREATE INDEX "parked_sales_status_idx" ON "parked_sales"("status")`,
    `CREATE INDEX "parked_sales_parked_at_idx" ON "parked_sales"("parked_at")`,
    `CREATE INDEX "parked_sales_created_at_idx" ON "parked_sales"("created_at")`,
    `CREATE INDEX "parked_sales_tenant_id_branch_id_updated_at_idx" ON "parked_sales"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "parked_sales_updated_at_idx" ON "parked_sales"("updated_at")`,
    `CREATE INDEX "parked_sales_deleted_at_idx" ON "parked_sales"("deleted_at")`,

    // ========== printers ==========
    `CREATE TABLE "printers_new" AS SELECT id, printer_id, tenant_id, branch_id, terminal_id, printer_name, printer_model, printer_type, connection_type, connection_address, port, vendor_id, product_id, serial_number, is_default, is_receipt_printer, is_label_printer, is_kitchen_printer, is_report_printer, status, configuration, last_connected, last_print_job, print_job_count, error_count, last_error, is_active, last_synced_at, version, deleted_at, created_at, updated_at FROM "printers"`,
    `DROP TABLE "printers"`,
    `ALTER TABLE "printers_new" RENAME TO "printers"`,
    `CREATE UNIQUE INDEX "printers_printer_id_key" ON "printers"("printer_id")`,
    `CREATE INDEX "printers_tenant_id_idx" ON "printers"("tenant_id")`,
    `CREATE INDEX "printers_branch_id_idx" ON "printers"("branch_id")`,
    `CREATE INDEX "printers_terminal_id_idx" ON "printers"("terminal_id")`,
    `CREATE INDEX "printers_is_default_idx" ON "printers"("is_default")`,
    `CREATE INDEX "printers_status_idx" ON "printers"("status")`,
    `CREATE INDEX "printers_tenant_id_branch_id_updated_at_idx" ON "printers"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "printers_updated_at_idx" ON "printers"("updated_at")`,
    `CREATE INDEX "printers_deleted_at_idx" ON "printers"("deleted_at")`,

    // ========== sale_payments ==========
    `CREATE TABLE "sale_payments_new" AS SELECT sale_payment_id, sale_id, payment_method_id, terminal_id, amount, reference, provider_id, provider_ref, status, processed_at, notes, last_synced_at, version, deleted_at, created_at, updated_at FROM "sale_payments"`,
    `DROP TABLE "sale_payments"`,
    `ALTER TABLE "sale_payments_new" RENAME TO "sale_payments"`,
    `CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments"("sale_id")`,
    `CREATE INDEX "sale_payments_payment_method_id_idx" ON "sale_payments"("payment_method_id")`,
    `CREATE INDEX "sale_payments_status_idx" ON "sale_payments"("status")`,
    `CREATE INDEX "sale_payments_processed_at_idx" ON "sale_payments"("processed_at")`,
    `CREATE INDEX "sale_payments_updated_at_idx" ON "sale_payments"("updated_at")`,
    `CREATE INDEX "sale_payments_deleted_at_idx" ON "sale_payments"("deleted_at")`,

    // ========== staff ==========
    `CREATE TABLE "staff_new" AS SELECT id, staff_id, user_id, tenant_id, branch_id, terminal_id, employee_code, department, designation, joining_date, termination_date, calculate_as, staff_salary, salary_frequency, track_attendance, allow_self_attendance, attendance_type, avg_shift_hours, allow_app_access, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, address, city, state, postal_code, country, national_id, date_of_birth, gender, bank_name, bank_account_number, bank_branch_code, employment_status, notes, last_synced_at, version, deleted_at, created_at, updated_at FROM "staff"`,
    `DROP TABLE "staff"`,
    `ALTER TABLE "staff_new" RENAME TO "staff"`,
    `CREATE UNIQUE INDEX "staff_staff_id_key" ON "staff"("staff_id")`,
    `CREATE UNIQUE INDEX "staff_user_id_key" ON "staff"("user_id")`,
    `CREATE UNIQUE INDEX "unique_tenant_employee_code" ON "staff"("tenant_id", "employee_code")`,
    `CREATE INDEX "idx_staff_user_id" ON "staff"("user_id")`,
    `CREATE INDEX "idx_staff_tenant_id" ON "staff"("tenant_id")`,
    `CREATE INDEX "idx_staff_branch_id" ON "staff"("branch_id")`,
    `CREATE INDEX "idx_staff_employment_status" ON "staff"("employment_status")`,
    `CREATE INDEX "idx_staff_joining_date" ON "staff"("joining_date")`,
    `CREATE INDEX "staff_tenant_id_branch_id_updated_at_idx" ON "staff"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "staff_updated_at_idx" ON "staff"("updated_at")`,
    `CREATE INDEX "staff_deleted_at_idx" ON "staff"("deleted_at")`,

    // Re-enable foreign key checks
    `PRAGMA foreign_keys=ON`,
];

export const migration: Migration = {
    version: '20260306_03',
    description: 'Remove legacy synced column from all tables (incompatible with multi-terminal sync)',
    up: {
        sqlite: sqliteStatements,
        mysql: mysqlStatements,
    },
    down: {
        sqlite: [
            // Re-adding synced column is simple - just ALTER TABLE ADD COLUMN
            `ALTER TABLE "audit_logs" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "branch_settings" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "branches" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "categories" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "customers" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "inventory_old" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "orders" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "return_items" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "payment_methods" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "permissions" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "role_permissions" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "roles" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "service_provider" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "subscription_plans" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "branch_subscriptions" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "tenants" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "terminals" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "transactions" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "user_permissions" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "user_sessions" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "users" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "payment_service_providers" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "parked_sales" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "printers" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "sale_payments" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            `ALTER TABLE "staff" ADD COLUMN "synced" INTEGER DEFAULT 0`,
        ],
        mysql: [
            `ALTER TABLE \`audit_logs\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`branch_settings\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`branches\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`categories\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`customers\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`inventory_old\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`orders\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`return_items\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`payment_methods\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`permissions\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`role_permissions\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`roles\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`service_provider\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`subscription_plans\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`branch_subscriptions\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`tenants\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`terminals\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`transactions\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`user_permissions\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`user_sessions\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`users\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`payment_service_providers\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`parked_sales\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`printers\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`sale_payments\` ADD COLUMN \`synced\` INT DEFAULT 0`,
            `ALTER TABLE \`staff\` ADD COLUMN \`synced\` INT DEFAULT 0`,
        ],
    },
};
