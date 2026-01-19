/**
 * Field-friendly names mapping for database columns
 * Maps technical field names to user-friendly display names
 */
const fieldNameMap: Record<string, string> = {
    // Common fields
    id: 'ID',
    uuid: 'ID',
    sku: 'SKU',
    name: 'Name',
    email: 'Email',
    phone: 'Phone Number',
    status: 'Status',

    // Barcode fields
    primary_barcode: 'Primary Barcode',
    primaryBarcode: 'Primary Barcode',
    barcode: 'Barcode',

    // Foreign key fields
    product_id: 'Product',
    productId: 'Product',
    tenant_id: 'Tenant',
    tenantId: 'Tenant',
    branch_id: 'Branch',
    branchId: 'Branch',
    category_id: 'Category',
    categoryId: 'Category',
    supplier_id: 'Supplier',
    supplierId: 'Supplier',
    user_id: 'User',
    userId: 'User',
    role_id: 'Role',
    roleId: 'Role',
    customer_id: 'Customer',
    customerId: 'Customer',
    order_id: 'Order',
    orderId: 'Order',

    // Composite unique constraints
    unique_branch_sku: 'SKU (within this branch)',
    unique_product_barcode: 'Product Barcode',
    unique_tenant_email: 'Email (within this tenant)',
    unique_branch_name: 'Name (within this branch)',

    // User fields
    username: 'Username',
    fullname: 'Full Name',
    password: 'Password',

    // Product fields
    selling_price: 'Selling Price',
    sellingPrice: 'Selling Price',
    cost_price: 'Cost Price',
    costPrice: 'Cost Price',

    // Inventory fields
    quantity: 'Quantity',
    min_stock: 'Minimum Stock',
    minStock: 'Minimum Stock',
    max_stock: 'Maximum Stock',
    maxStock: 'Maximum Stock',
    reorder_point: 'Reorder Point',
    reorderPoint: 'Reorder Point',
};

/**
 * Get friendly field name for display
 * @param field - The technical field name
 * @returns User-friendly field name
 */
export function getFriendlyFieldName(field: string): string {
    // Check direct mapping first
    if (fieldNameMap[field]) {
        return fieldNameMap[field];
    }

    // Convert snake_case or camelCase to Title Case
    return field
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

/**
 * Register a custom field name mapping
 * @param technicalName - The technical field name
 * @param friendlyName - The user-friendly display name
 */
export function registerFieldName(technicalName: string, friendlyName: string): void {
    fieldNameMap[technicalName] = friendlyName;
}

/**
 * Register multiple field name mappings at once
 * @param mappings - Object containing field name mappings
 */
export function registerFieldNames(mappings: Record<string, string>): void {
    Object.assign(fieldNameMap, mappings);
}

/**
 * Get all registered field name mappings
 * @returns Copy of the field name map
 */
export function getFieldNameMap(): Record<string, string> {
    return { ...fieldNameMap };
}
