-- =====================================================
-- MULTI-TENANT POS DATABASE SCHEMA FOR MRA EIS INTEGRATION
-- Updated based on MRA API Swagger Specification
-- =====================================================

-- =====================================================
-- TENANT MANAGEMENT
-- =====================================================

CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) NOT NULL,
    tin VARCHAR(50) UNIQUE NOT NULL,
    business_type ENUM('PRODUCT_BASED', 'SERVICE_BASED') NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    is_vat_registered BOOLEAN DEFAULT FALSE,
    tax_office_code VARCHAR(50),
    mra_portal_username VARCHAR(100),
    msonkho_online_status ENUM('VERIFIED', 'PENDING', 'FAILED') DEFAULT 'PENDING',
    subscription_plan VARCHAR(50),
    subscription_status ENUM('ACTIVE', 'SUSPENDED', 'CANCELLED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tin (tin),
    INDEX idx_subscription_status (subscription_status)
);

-- =====================================================
-- MRA API CONFIGURATION & CREDENTIALS
-- =====================================================

CREATE TABLE mra_api_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    environment ENUM('SANDBOX', 'PRODUCTION') DEFAULT 'SANDBOX',
    api_base_url VARCHAR(255) NOT NULL,
    jwt_token TEXT ENCRYPTED,
    secret_key VARCHAR(255) ENCRYPTED,
    last_sync_timestamp TIMESTAMP,
    sync_status ENUM('SUCCESS', 'FAILED', 'IN_PROGRESS') DEFAULT 'SUCCESS',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    UNIQUE KEY unique_tenant_env (tenant_id, environment)
);

-- =====================================================
-- MRA CONFIGURATIONS (Synced from MRA)
-- =====================================================

CREATE TABLE mra_global_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    version_no DECIMAL(10,2) NOT NULL,
    config_data JSON NOT NULL, -- Stores complete TaxConfiguration
    is_active BOOLEAN DEFAULT TRUE,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    INDEX idx_tenant_version (tenant_id, version_no DESC)
);

CREATE TABLE mra_taxpayer_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    version_no DECIMAL(10,2) NOT NULL,
    tin VARCHAR(50) NOT NULL,
    is_vat_registered BOOLEAN DEFAULT FALSE,
    tax_office_code VARCHAR(50),
    config_data JSON NOT NULL, -- Stores complete TaxpayerConfiguration
    is_active BOOLEAN DEFAULT TRUE,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    INDEX idx_tenant_version (tenant_id, version_no DESC)
);

CREATE TABLE mra_tax_rates (
    tax_rate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    global_config_id UUID NOT NULL,
    rate_id VARCHAR(50) NOT NULL, -- MRA TaxRate ID
    rate_name VARCHAR(255) NOT NULL,
    charge_mode VARCHAR(50), -- e.g., "PERCENTAGE"
    ordinal INT,
    rate DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (global_config_id) REFERENCES mra_global_config(config_id),
    INDEX idx_tenant_rate (tenant_id, rate_id)
);

CREATE TABLE mra_levies (
    levy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    taxpayer_config_id UUID NOT NULL,
    levy_type_id VARCHAR(50) NOT NULL,
    levy_name VARCHAR(255) NOT NULL,
    charge_mode VARCHAR(50),
    rate DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (taxpayer_config_id) REFERENCES mra_taxpayer_config(config_id),
    INDEX idx_tenant_levy (tenant_id, levy_type_id)
);

-- =====================================================
-- BRANCHES & SITES
-- =====================================================

CREATE TABLE branches (
    branch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(50) NOT NULL,
    site_id VARCHAR(100), -- MRA Site ID
    site_name VARCHAR(255), -- MRA Site Name
    is_virtual_warehouse BOOLEAN DEFAULT FALSE,
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    address_line_3 VARCHAR(255),
    city VARCHAR(100),
    district VARCHAR(100),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    mra_approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    mra_approval_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    UNIQUE KEY unique_tenant_branch_code (tenant_id, branch_code),
    INDEX idx_tenant_site (tenant_id, site_id),
    INDEX idx_tenant_active (tenant_id, is_active)
);

-- =====================================================
-- TERMINAL MANAGEMENT
-- =====================================================

CREATE TABLE terminals (
    terminal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    mra_terminal_id VARCHAR(100) UNIQUE, -- MRA generated terminal ID
    terminal_code VARCHAR(100) UNIQUE NOT NULL,
    terminal_label VARCHAR(255) NOT NULL,
    terminal_position INT,
    activation_code VARCHAR(255), -- Code received from MRA
    activation_status ENUM('PENDING', 'ACTIVATED', 'DEACTIVATED', 'SUSPENDED', 'BLOCKED') DEFAULT 'PENDING',
    activation_date TIMESTAMP NULL,
    device_id VARCHAR(100),
    os_name VARCHAR(100),
    os_version VARCHAR(100),
    os_build VARCHAR(100),
    mac_address VARCHAR(50),
    pos_product_id VARCHAR(100), -- POS software identifier
    pos_product_version VARCHAR(50),
    terminal_config_version DECIMAL(10,2),
    offline_max_transaction_age_hours DECIMAL(10,2),
    offline_max_cumulative_amount DECIMAL(15,2),
    is_blocked BOOLEAN DEFAULT FALSE,
    blocking_reason TEXT,
    blocked_at TIMESTAMP NULL,
    mra_application_status ENUM('APPLIED', 'APPROVED', 'REJECTED') DEFAULT 'APPLIED',
    mra_approval_date TIMESTAMP NULL,
    last_sync_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    INDEX idx_tenant_branch (tenant_id, branch_id),
    INDEX idx_activation_status (activation_status),
    INDEX idx_blocked (is_blocked)
);

-- =====================================================
-- PRODUCTS (Synced from MRA)
-- =====================================================

CREATE TABLE products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL, -- Products are site-specific
    product_code VARCHAR(100) NOT NULL, -- MRA product code / barcode
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    ps_code VARCHAR(100), -- UNSPSC Product/Service Code
    ps_description TEXT,
    unit_of_measure VARCHAR(50),
    price DECIMAL(15,2),
    quantity DECIMAL(15,3),
    product_expiry_date TIMESTAMP NULL,
    minimum_stock_level DECIMAL(15,3),
    tax_rate_id VARCHAR(50), -- References MRA TaxRate ID
    is_product BOOLEAN DEFAULT TRUE, -- TRUE for product, FALSE for service
    mra_approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    mra_sync_status ENUM('SYNCED', 'PENDING_SYNC', 'FAILED') DEFAULT 'PENDING_SYNC',
    last_synced_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    UNIQUE KEY unique_tenant_product_code_branch (tenant_id, product_code, branch_id),
    INDEX idx_tenant_active (tenant_id, is_active),
    INDEX idx_product_code (product_code),
    INDEX idx_mra_approval (mra_approval_status)
);

-- =====================================================
-- SERVICES (For Service-Based Businesses)
-- =====================================================

CREATE TABLE services (
    service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    service_code VARCHAR(100) NOT NULL, -- MRA service code
    service_name VARCHAR(255) NOT NULL,
    description TEXT,
    ps_code VARCHAR(100),
    ps_description TEXT,
    price DECIMAL(15,2),
    tax_rate_id VARCHAR(50),
    is_product BOOLEAN DEFAULT FALSE,
    mra_approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    mra_sync_status ENUM('SYNCED', 'PENDING_SYNC', 'FAILED') DEFAULT 'PENDING_SYNC',
    last_synced_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    UNIQUE KEY unique_tenant_service_code_branch (tenant_id, service_code, branch_id),
    INDEX idx_tenant_active (tenant_id, is_active)
);

-- =====================================================
-- INVENTORY MANAGEMENT (Product-Based Businesses)
-- =====================================================

CREATE TABLE inventory (
    inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    product_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    quantity_on_hand DECIMAL(15,3) DEFAULT 0,
    quantity_reserved DECIMAL(15,3) DEFAULT 0,
    quantity_available DECIMAL(15,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    reorder_level DECIMAL(15,3) DEFAULT 0,
    over_stock_level DECIMAL(15,3),
    last_stock_take_date TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_branch (product_id, branch_id),
    INDEX idx_tenant_branch (tenant_id, branch_id)
);

-- =====================================================
-- INITIAL STOCK UPLOAD (Batch Processing)
-- =====================================================

CREATE TABLE initial_stock_uploads (
    upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    batch_number INT NOT NULL,
    is_last_batch BOOLEAN DEFAULT FALSE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_items INT DEFAULT 0,
    mapped_items INT DEFAULT 0,
    unmapped_items INT DEFAULT 0,
    upload_status ENUM('STAGING', 'SUBMITTED', 'PROCESSING', 'COMPLETED') DEFAULT 'STAGING',
    mra_approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    mra_approval_date TIMESTAMP NULL,
    mra_rejection_reason TEXT,
    skipped_items JSON, -- Array of skipped product codes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    INDEX idx_tenant_status (tenant_id, mra_approval_status)
);

CREATE TABLE initial_stock_upload_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID NOT NULL,
    bar_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    quantity_in_stock DECIMAL(15,3) NOT NULL,
    cost_price DECIMAL(15,2) NOT NULL,
    selling_price DECIMAL(15,2) NOT NULL,
    reorder_level DECIMAL(15,3),
    over_quantity_stock_level DECIMAL(15,3),
    item_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    FOREIGN KEY (upload_id) REFERENCES initial_stock_uploads(upload_id) ON DELETE CASCADE,
    INDEX idx_upload (upload_id)
);

-- =====================================================
-- ELECTRONIC INVOICES (Sent to MRA)
-- =====================================================

CREATE TABLE invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    terminal_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    invoice_number VARCHAR(100) NOT NULL, -- Local invoice number
    mra_validation_url TEXT, -- QR code URL from MRA
    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Seller Info
    seller_tin VARCHAR(50) NOT NULL,
    
    -- Buyer Info
    buyer_tin VARCHAR(50),
    buyer_name VARCHAR(255),
    buyer_authorization_code VARCHAR(100),
    
    -- Site Info
    site_id VARCHAR(100) NOT NULL,
    
    -- Configuration Versions
    global_config_version DECIMAL(10,2) NOT NULL,
    taxpayer_config_version DECIMAL(10,2) NOT NULL,
    terminal_config_version DECIMAL(10,2) NOT NULL,
    
    -- Special Flags
    is_export BOOLEAN DEFAULT FALSE,
    is_relief_supply BOOLEAN DEFAULT FALSE,
    
    -- VAT5 Certificate (for relief supplies)
    vat5_project_number VARCHAR(100),
    vat5_certificate_number VARCHAR(100),
    vat5_quantity DECIMAL(15,3),
    
    -- Payment
    payment_method VARCHAR(50),
    
    -- Amounts
    subtotal DECIMAL(15,2) NOT NULL,
    total_vat DECIMAL(15,2) NOT NULL,
    total_levy DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    amount_tendered DECIMAL(15,2),
    
    -- Offline Signature
    offline_signature TEXT,
    
    -- Invoice Type
    invoice_type ENUM('SALE', 'RETURN', 'CREDIT_NOTE', 'DEBIT_NOTE') DEFAULT 'SALE',
    
    -- MRA Submission
    mra_submission_status ENUM('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
    mra_submission_timestamp TIMESTAMP NULL,
    mra_response JSON,
    should_download_latest_config BOOLEAN DEFAULT FALSE,
    should_block_terminal BOOLEAN DEFAULT FALSE,
    validation_errors JSON,
    
    -- Sync Info
    is_synced BOOLEAN DEFAULT FALSE,
    is_offline_transaction BOOLEAN DEFAULT FALSE,
    sync_attempts INT DEFAULT 0,
    last_sync_attempt TIMESTAMP,
    
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (terminal_id) REFERENCES terminals(terminal_id),
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
    UNIQUE KEY unique_tenant_invoice (tenant_id, invoice_number),
    INDEX idx_tenant_date (tenant_id, invoice_date),
    INDEX idx_mra_status (mra_submission_status),
    INDEX idx_sync_pending (is_synced, mra_submission_status),
    INDEX idx_offline (is_offline_transaction)
);

CREATE TABLE invoice_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    product_id UUID NULL,
    service_id UUID NULL,
    item_type ENUM('PRODUCT', 'SERVICE') NOT NULL,
    product_code VARCHAR(100) NOT NULL, -- MRA product/service code
    description TEXT NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    discount DECIMAL(15,2) DEFAULT 0,
    tax_rate_id VARCHAR(50) NOT NULL, -- MRA TaxRate ID
    total_vat DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    is_product BOOLEAN NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    INDEX idx_invoice (invoice_id),
    CHECK ((product_id IS NOT NULL AND service_id IS NULL) OR (product_id IS NULL AND service_id IS NOT NULL))
);

CREATE TABLE invoice_tax_breakdown (
    breakdown_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    rate_id VARCHAR(50) NOT NULL, -- MRA TaxRate ID
    taxable_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    INDEX idx_invoice (invoice_id)
);

CREATE TABLE invoice_levy_breakdown (
    breakdown_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    levy_type_id VARCHAR(50) NOT NULL, -- MRA Levy ID
    levy_rate DECIMAL(5,2) NOT NULL,
    levy_amount DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    INDEX idx_invoice (invoice_id)
);

-- =====================================================
-- AUTHORIZATION CODES (For special transactions)
-- =====================================================

CREATE TABLE authorization_codes (
    code_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    authorization_code VARCHAR(100) UNIQUE NOT NULL,
    authorization_reason TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    generated_by VARCHAR(255),
    generated_on TIMESTAMP,
    expires_on TIMESTAMP,
    used_on TIMESTAMP NULL,
    validation_response JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    INDEX idx_code (authorization_code),
    INDEX idx_tenant_valid (tenant_id, is_valid)
);

-- =====================================================
-- VAT5 CERTIFICATES (For relief supplies)
-- =====================================================

CREATE TABLE vat5_certificates (
    certificate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_number VARCHAR(100) NOT NULL,
    certificate_number VARCHAR(100) NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    date_of_issue TIMESTAMP,
    date_of_expiry TIMESTAMP,
    is_valid BOOLEAN DEFAULT TRUE,
    validation_response JSON,
    last_validated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    UNIQUE KEY unique_certificate (project_number, certificate_number),
    INDEX idx_tenant_valid (tenant_id, is_valid)
);

-- =====================================================
-- MRA API SYNC LOGS
-- =====================================================

CREATE TABLE mra_api_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    terminal_id UUID,
    endpoint VARCHAR(255) NOT NULL,
    http_method VARCHAR(10),
    request_payload JSON,
    response_payload JSON,
    response_code INT,
    status ENUM('SUCCESS', 'FAILED', 'TIMEOUT') NOT NULL,
    error_message TEXT,
    errors JSON, -- Array of APIError objects
    execution_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (terminal_id) REFERENCES terminals(terminal_id) ON DELETE SET NULL,
    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_status_created (status, created_at),
    INDEX idx_endpoint (endpoint)
);

-- =====================================================
-- SYNC QUEUE (For Real-time MRA Submissions)
-- =====================================================

CREATE TABLE mra_sync_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    terminal_id UUID,
    entity_type ENUM('INVOICE', 'PRODUCT', 'SERVICE', 'INITIAL_STOCK', 'CONFIGURATION', 'TERMINAL_ACTIVATION') NOT NULL,
    entity_id UUID NOT NULL,
    action ENUM('CREATE', 'UPDATE', 'DELETE', 'SYNC') NOT NULL,
    priority INT DEFAULT 5, -- 1=highest, 10=lowest
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (terminal_id) REFERENCES terminals(terminal_id) ON DELETE SET NULL,
    INDEX idx_status_priority (status, priority, scheduled_at),
    INDEX idx_tenant_status (tenant_id, status)
);

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    role ENUM('ADMIN', 'MANAGER', 'CASHIER', 'INVENTORY_MANAGER') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    UNIQUE KEY unique_tenant_username (tenant_id, username),
    UNIQUE KEY unique_email (email),
    INDEX idx_tenant_active (tenant_id, is_active)
);

-- =====================================================
-- AUDIT TRAIL
-- =====================================================

CREATE TABLE audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, SYNC, ACTIVATE, BLOCK
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_action_created (action, created_at)
);

-- =====================================================
-- LAST SUBMITTED TRANSACTIONS (Cache)
-- =====================================================

CREATE TABLE last_submitted_transactions (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    terminal_id UUID NOT NULL,
    transaction_type ENUM('ONLINE', 'OFFLINE') NOT NULL,
    invoice_id UUID NOT NULL,
    invoice_data JSON NOT NULL, -- Complete SalesInvoice object
    date_submitted TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (terminal_id) REFERENCES terminals(terminal_id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    UNIQUE KEY unique_terminal_type (terminal_id, transaction_type),
    INDEX idx_tenant_terminal (tenant_id, terminal_id)
);