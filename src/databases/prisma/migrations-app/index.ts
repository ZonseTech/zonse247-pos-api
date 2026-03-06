/**
 * Migration Registry
 * 
 * This file statically imports all migrations so they can be bundled
 * with the application code. This is necessary because dynamic require()
 * doesn't work reliably when the code is bundled (e.g., by Vite for Electron).
 * 
 * IMPORTANT: When adding a new migration, add an import and register it here.
 * The make:migration task will automatically update this file.
 */

import { Migration } from '../migration.types';
import { migration as m20250101_01 } from './20250101_01_initial_schema_baseline_version';
import { migration as m20260108_01 } from './20260108_01_add_db_meta_table_for_version_tracking';
import { migration as m20260110_01 } from './20260110_01_add_tenant_registration_details_table_for_storing_temporary_registration_info';
import { migration as m20260120_01 } from './20260120_01_add_salepayment_table_for_multiple_payment_method_support';
import { migration as m20260120_02 } from './20260120_02_add_parkedsale_and_parkedsaleitem_tables_for_parked_held_sales';
import { migration as m20260121_01 } from './20260121_01_change_salenumber_from_global_unique_to_per_tenant_branch_unique_for_offline_support';
import { migration as m20260208_01 } from './20260208_01_make_product_sku_nullable_and_remove_unique_constraint';
import { migration as m20260208_02 } from './20260208_02_add_productvariant_model_and_migrate_existing_products_to_variants_non_destructive';
import { migration as m20260208_03 } from './20260208_03_fix_inventory_constraints_for_variant_support_remove_unique_on_product_id_add_unique_on_variant_id';
import { migration as m20260210_01 } from './20260210_01_add_expiry_date_alert_column_to_product_variants_table_for_expiration_alerts';
import { migration as m20260210_02 } from './20260210_02_add_productid_field_to_saleitem_prisma_schema_column_already_exists_in_database';
import { migration as m20260210_03 } from './20260210_03_fix_sale_items_unique_constraint_from_sale_id_product_id_to_sale_id_variant_id';
import { migration as m20260211_01 } from './20260211_01_add_staff_table_for_employee_staff_management_with_attendance_tracking';
import { migration as m20260212_01 } from './20260212_01_add_other_charges_column_to_sales_and_parked_sales_tables';
import { migration as m20260215_01 } from './20260215_01_add_districts_table_with_all_malawi_districts_and_districtid_to_branches';
import { migration as m20260215_02 } from './20260215_02_add_businesstype_and_location_columns_to_branches_table_rename_district_to_location';
import { migration as m20260216_01 } from './20260216_01_simplify_terminal_settings_table_to_use_4_json_settings_groups';
import { migration as m20260219_01 } from './20260219_01_add_missing_columns_to_products_table_default_unit_custom_attribute_schema_image_url';
import { migration as m20260219_02 } from './20260219_02_restructure_sqlite_products_table_to_remove_old_variant_columns_sku_unit_selling_price_etc';
import { migration as m20260219_03 } from './20260219_03_ensure_numeric_columns_default_to_0_and_handle_empty_strings';
import { migration as m20260223_01 } from './20260223_01_restructure_sqlite_products_table_recreate_with_clean_schema';
import { migration as m20260302_01 } from './20260302_01_add_soft_delete_deleted_at_to_all_syncable_tables';
import { migration as m20260302_02 } from './20260302_02_add_optimistic_locking_version_to_all_syncable_tables';
import { migration as m20260302_03 } from './20260302_03_add_origin_tracking_terminal_id_to_syncable_tables';
import { migration as m20260302_04 } from './20260302_04_fix_global_unique_constraints_to_tenant_scoped';
import { migration as m20260302_05 } from './20260302_05_add_sync_indexes_for_delta_queries';
import { migration as m20260302_06 } from './20260302_06_add_terminal_sync_tracking_fields';
import { migration as m20260302_07 } from './20260302_07_add_mra_fields_to_sale';
import { migration as m20260302_08 } from './20260302_08_create_mra_submission_table';
import { migration as m20260302_09 } from './20260302_09_add_last_synced_at_to_syncable_tables';
import { migration as m20260303_01 } from './20260303_01_move_subscription_fields_from_tenants_to_branches';
import { migration as m20260304_01 } from './20260304_01_add_branch_id_to_tenant_subscriptions';
import { migration as m20260304_02 } from './20260304_02_refactor_tenant_subscription_to_branch_subscription';
import { migration as m20260304_03 } from './20260304_03_migrate_tenant_subscriptions_to_branch_subscriptions';
import { migration as m20260304_04 } from './20260304_04_create_onboarding_progress_tables';
import { migration as m20260306_01 } from './20260306_01_add_updated_at_to_sale_items_and_stock_movements';
import { migration as m20260306_02 } from './20260306_02_add_stockmovement_composite_index_for_performance';
import { migration as m20260306_03 } from './20260306_03_remove_legacy_synced_column_from_all_tables';
import { migration as m20260306_04 } from './20260306_04_add_tenant_branch_ids_to_child_tables_for_sync';
import { migration as m20260306_05 } from './20260306_05_create_terminal_sync_state_table_for_sync_tracking';
import { migration as m20260306_06 } from './20260306_06_create_change_log_table_for_delta_sync';
import { migration as m20260306_07 } from './20260306_07_add_version_deleted_at_to_tenant_branch_role_permission_tables';
import { migration as m20260307_01 } from './20260307_01_add_triggers_to_enforce_stockmovement_immutability';

/**
 * All registered migrations, sorted by version
 */
export const registeredMigrations: Migration[] = [
    m20250101_01,
    m20260108_01,
    m20260110_01,
    m20260120_01,
    m20260120_02,
    m20260121_01,
    m20260208_01,
    m20260208_02,
    m20260208_03,
    m20260210_01,
    m20260210_02,
    m20260210_03,
    m20260211_01,
    m20260212_01,
    m20260215_01,
    m20260215_02,
    m20260216_01,
    m20260219_01,
    m20260219_02,
    m20260219_03,
    m20260223_01,
    m20260302_01,
    m20260302_02,
    m20260302_03,
    m20260302_04,
    m20260302_05,
    m20260302_06,
    m20260302_07,
    m20260302_08,
    m20260302_09,
    m20260303_01,
    m20260304_01,
    m20260304_02,
    m20260304_03,
    m20260304_04,
    m20260306_01,
    m20260306_02,
    m20260306_03,
    m20260306_04,
    m20260306_05,
    m20260306_06,
    m20260306_07,
    m20260307_01,
].sort((a, b) => a.version.localeCompare(b.version));

/**
 * Get all registered migrations
 */
export function getAllRegisteredMigrations(): Migration[] {
    return registeredMigrations;
}
