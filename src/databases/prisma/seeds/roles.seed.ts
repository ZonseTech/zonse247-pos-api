import { PrismaClient } from "../generated/prisma/client";

export async function seedRoles(prisma: PrismaClient) {
    console.log('📝 Seeding roles...');

    const roles = [
        // =====================================================
        // SYSTEM-LEVEL ROLES (Platform Administration)
        // =====================================================
        {
            roleId: 'super-admin',
            name: 'super_admin',
            displayName: 'Super Administrator',
            description: 'Platform super administrator with full access across all tenants, locations, and system configurations',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'support-admin',
            name: 'support_admin',
            displayName: 'Support Administrator',
            description: 'Platform support staff with access to help tenants troubleshoot issues',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // TENANT-LEVEL ROLES (Business Ownership & Administration)
        // =====================================================
        {
            roleId: 'tenant-owner',
            name: 'tenant_owner',
            displayName: 'Business Owner',
            description: 'Business owner with full access to all locations, reports, and settings within their tenant',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'admin',
            name: 'admin',
            displayName: 'Administrator',
            description: 'Tenant administrator with full operational access across all locations',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'operations-director',
            name: 'operations_director',
            displayName: 'Operations Director',
            description: 'Oversees operations across multiple branches/locations for larger businesses',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // LOCATION/BRANCH-LEVEL ROLES (Store Management)
        // =====================================================
        {
            roleId: 'branch-manager',
            name: 'branch_manager',
            displayName: 'Branch Manager',
            description: 'Full control over a specific branch/location including staff, inventory, and sales',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'assistant-manager',
            name: 'assistant_manager',
            displayName: 'Assistant Manager',
            description: 'Assists branch manager with day-to-day operations and staff supervision',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'manager',
            name: 'manager',
            displayName: 'Manager',
            description: 'General manager with operational management access',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'shift-supervisor',
            name: 'shift_supervisor',
            displayName: 'Shift Supervisor',
            description: 'Supervises staff during shifts with elevated cashier privileges and basic management functions',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'team-lead',
            name: 'team_lead',
            displayName: 'Team Lead',
            description: 'Leads a small team, handles escalations, and assists with training',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // FINANCIAL ROLES (Accounting & Finance)
        // =====================================================
        {
            roleId: 'finance-manager',
            name: 'finance_manager',
            displayName: 'Finance Manager',
            description: 'Manages all financial operations, reporting, and reconciliation across locations',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'accountant',
            name: 'accountant',
            displayName: 'Accountant',
            description: 'Handles financial reporting, tax management, and payment reconciliation',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'bookkeeper',
            name: 'bookkeeper',
            displayName: 'Bookkeeper',
            description: 'Records daily transactions and maintains financial records',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // INVENTORY & SUPPLY CHAIN ROLES
        // =====================================================
        {
            roleId: 'inventory-manager',
            name: 'inventory_manager',
            displayName: 'Inventory Manager',
            description: 'Manages inventory levels, stock transfers, and purchasing across locations',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'warehouse-supervisor',
            name: 'warehouse_supervisor',
            displayName: 'Warehouse Supervisor',
            description: 'Supervises warehouse operations, receiving, and distribution',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'stock-clerk',
            name: 'stock_clerk',
            displayName: 'Stock Clerk',
            description: 'Handles receiving, stocking shelves, and basic inventory counts',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'purchasing-officer',
            name: 'purchasing_officer',
            displayName: 'Purchasing Officer',
            description: 'Manages supplier relationships and purchase orders',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // SALES & CUSTOMER SERVICE ROLES (Front-line Staff)
        // =====================================================
        {
            roleId: 'sales-manager',
            name: 'sales_manager',
            displayName: 'Sales Manager',
            description: 'Manages sales team, targets, and customer relationships',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'senior-cashier',
            name: 'senior_cashier',
            displayName: 'Senior Cashier',
            description: 'Experienced cashier with refund processing and discount override capabilities',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'cashier',
            name: 'cashier',
            displayName: 'Cashier',
            description: 'Processes sales transactions, handles payments, and basic customer service',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'trainee-cashier',
            name: 'trainee_cashier',
            displayName: 'Trainee Cashier',
            description: 'New cashier in training with limited permissions',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'sales-associate',
            name: 'sales_associate',
            displayName: 'Sales Associate',
            description: 'Assists customers, provides product information, and supports sales',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'customer-service-rep',
            name: 'customer_service_rep',
            displayName: 'Customer Service Representative',
            description: 'Handles customer inquiries, complaints, and returns',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // CAFE & RESTAURANT SPECIFIC ROLES
        // =====================================================
        {
            roleId: 'barista',
            name: 'barista',
            displayName: 'Barista',
            description: 'Prepares beverages and handles cafe counter sales',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'server',
            name: 'server',
            displayName: 'Server/Waiter',
            description: 'Takes orders, serves customers, and processes table payments',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'kitchen-staff',
            name: 'kitchen_staff',
            displayName: 'Kitchen Staff',
            description: 'Views orders, manages kitchen display, and updates order status',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'head-chef',
            name: 'head_chef',
            displayName: 'Head Chef',
            description: 'Manages kitchen operations, recipes, and food inventory',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // BAR SPECIFIC ROLES
        // =====================================================
        {
            roleId: 'bar-manager',
            name: 'bar_manager',
            displayName: 'Bar Manager',
            description: 'Manages bar operations, staff scheduling, and liquor inventory',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'bartender',
            name: 'bartender',
            displayName: 'Bartender',
            description: 'Prepares drinks, serves customers, and handles bar sales',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'host',
            name: 'host',
            displayName: 'Host/Hostess',
            description: 'Manages reservations, seating, and customer reception',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // PHARMACY SPECIFIC ROLES
        // =====================================================
        {
            roleId: 'pharmacist',
            name: 'pharmacist',
            displayName: 'Pharmacist',
            description: 'Licensed pharmacist with full access to dispensing and controlled substances',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'pharmacy-manager',
            name: 'pharmacy_manager',
            displayName: 'Pharmacy Manager',
            description: 'Manages pharmacy operations, compliance, and staff',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'pharmacy-technician',
            name: 'pharmacy_technician',
            displayName: 'Pharmacy Technician',
            description: 'Assists pharmacist with dispensing and inventory under supervision',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'pharmacy-assistant',
            name: 'pharmacy_assistant',
            displayName: 'Pharmacy Assistant',
            description: 'Handles front-store sales and basic pharmacy support',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // RETAIL STORE SPECIFIC ROLES
        // =====================================================
        {
            roleId: 'floor-manager',
            name: 'floor_manager',
            displayName: 'Floor Manager',
            description: 'Manages store floor operations, merchandising, and staff supervision',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'merchandiser',
            name: 'merchandiser',
            displayName: 'Merchandiser',
            description: 'Handles product displays, pricing updates, and visual merchandising',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'delivery-staff',
            name: 'delivery_staff',
            displayName: 'Delivery Staff',
            description: 'Handles order deliveries and updates delivery status',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // SMALL BUSINESS SIMPLIFIED ROLES
        // =====================================================
        {
            roleId: 'owner-operator',
            name: 'owner_operator',
            displayName: 'Owner-Operator',
            description: 'Small business owner who handles all operations (ideal for single-person stores)',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'part-time-staff',
            name: 'part_time_staff',
            displayName: 'Part-Time Staff',
            description: 'Limited access for part-time employees with basic sales capabilities',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // AUDIT & COMPLIANCE ROLES (Read-Only)
        // =====================================================
        {
            roleId: 'auditor',
            name: 'auditor',
            displayName: 'Auditor',
            description: 'Full read-only access for internal or external audit purposes',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'compliance-officer',
            name: 'compliance_officer',
            displayName: 'Compliance Officer',
            description: 'Monitors compliance, views logs, and ensures regulatory adherence',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'viewer',
            name: 'viewer',
            displayName: 'Viewer',
            description: 'Basic read-only access to view sales, products, and reports',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'report-viewer',
            name: 'report_viewer',
            displayName: 'Report Viewer',
            description: 'Access only to view reports and analytics',
            isSystemRole: true,
            isActive: true,
        },

        // =====================================================
        // EXTERNAL/INTEGRATION ROLES
        // =====================================================
        {
            roleId: 'api-user',
            name: 'api_user',
            displayName: 'API User',
            description: 'External system integration with limited API access',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'kiosk',
            name: 'kiosk',
            displayName: 'Self-Service Kiosk',
            description: 'Automated kiosk terminal with restricted sales-only access',
            isSystemRole: true,
            isActive: true,
        },
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: { roleId: role.roleId },
            update: {
                name: role.name,
                displayName: role.displayName,
                description: role.description,
                isSystemRole: role.isSystemRole,
                isActive: role.isActive,
            },
            create: {
                roleId: role.roleId,
                name: role.name,
                displayName: role.displayName,
                description: role.description,
                isSystemRole: role.isSystemRole,
                isActive: role.isActive,
            },
        });
    }

    console.log(`✓ ${roles.length} roles seeded`);
}