import { CATEGORIES_DB, CUSTOMERS_DB, INVENTORY_DB, ORDERS_DB, TRANSACTIONS_DB, USERS_DB } from "./tables";
// VITALIRVH
export default {
    [CATEGORIES_DB]: [
        {
            dbColumn: 'uuid',
            recordColumn: '_id',
        },
        {
            dbColumn: 'shop_uuid',
            recordColumn: 'f9816061-7941-4a94-b555-8d9567e4b346',
        },
        {
            dbColumn: 'client_uuid',
            recordColumn: '07d80a7c-8df6-460f-a8aa-d965bde36418',
        },
        {
            dbColumn: 'user_uuid',
            recordColumn: '1746011936',
        },
        {
            dbColumn: 'name',
            recordColumn: 'name',
        },
        {
            dbColumn: 'description',
            recordColumn: 'name',
        },
        {
            dbColumn: 'color',
            recordColumn: '#006699',
        },
        {
            dbColumn: 'is_active',
            recordColumn: '',
        },
        {
            dbColumn: 'sort_order',
            recordColumn: '0',
        },
        {
            dbColumn: 'item_count',
            recordColumn: '0',
        },
        {
            dbColumn: 'synced',
            recordColumn: '0',
        },
        {
            dbColumn: 'created_at',
            recordColumn: 'created_at',
        },
        {
            dbColumn: 'updated_at',
            recordColumn: 'updated_at',
        },
    ],
    [CUSTOMERS_DB]: [
        {
            dbColumn: 'uuid',
            recordColumn: '_id',
        },
        {
            dbColumn: 'client_uuid',
            recordColumn: '07d80a7c-8df6-460f-a8aa-d965bde36418',
        },
        {
            dbColumn: 'shop_uuid',
            recordColumn: 'f9816061-7941-4a94-b555-8d9567e4b346',
        },
        {
            dbColumn: 'user_uuid',
            recordColumn: '1746011936',
        },
        {
            dbColumn: 'name',
            recordColumn: 'name',
        },
        {
            dbColumn: 'synced',
            recordColumn: '',
        },
        {
            dbColumn: 'created_at',
            recordColumn: '',
        },
        {
            dbColumn: 'updated_at',
            recordColumn: '',
        },
    ],
    [INVENTORY_DB]: [
        {
            dbColumn: 'uuid',
            recordColumn: '_id',
        },
        {
            dbColumn: 'shop_uuid',
            recordColumn: 'f9816061-7941-4a94-b555-8d9567e4b346',
        },
        {
            dbColumn: 'client_uuid',
            recordColumn: '07d80a7c-8df6-460f-a8aa-d965bde36418',
        },
        {
            dbColumn: 'user_uuid',
            recordColumn: '1746011936',
        },
        {
            dbColumn: 'category_uuid',
            recordColumn: 'category',
        },
        {
            dbColumn: 'barcode',
            recordColumn: 'barcode',
        },
        {
            dbColumn: 'sku',
            recordColumn: '',
        },
        {
            dbColumn: 'name',
            recordColumn: 'name',
        },
        {
            dbColumn: 'description',
            recordColumn: 'name',
        },
        {
            dbColumn: 'brand',
            recordColumn: '',
        },
        {
            dbColumn: 'unit',
            recordColumn: '',
        },
        {
            dbColumn: 'cost_price',
            recordColumn: 'cost_price',
        },
        {
            dbColumn: 'sell_price',
            recordColumn: 'sell_price',
        },
        {
            dbColumn: 'promo_price',
            recordColumn: 'promo_price',
        },
        {
            dbColumn: 'promo_start',
            recordColumn: '',
        },
        {
            dbColumn: 'promo_end',
            recordColumn: '',
        },
        {
            dbColumn: 'quantity',
            recordColumn: 'quantity',
        },
        {
            dbColumn: 'reserved_quantity',
            recordColumn: '',
        },
        {
            dbColumn: 'min_stock',
            recordColumn: 'min_stock',
        },
        {
            dbColumn: 'original_quantity',
            recordColumn: '',
        },
        {
            dbColumn: 'max_stock',
            recordColumn: '',
        },
        {
            dbColumn: 'stock',
            recordColumn: 'stock',
        },
        {
            dbColumn: 'reorder_level',
            recordColumn: '',
        },
        {
            dbColumn: 'weight',
            recordColumn: '',
        },
        {
            dbColumn: 'dimensions',
            recordColumn: '',
        },
        {
            dbColumn: 'color',
            recordColumn: '#006699',
        },
        {
            dbColumn: 'size',
            recordColumn: '',
        },
        {
            dbColumn: 'status',
            recordColumn: 'active',
        },
        {
            dbColumn: 'track_inventory',
            recordColumn: '',
        },
        {
            dbColumn: 'allow_negative_stock',
            recordColumn: '',
        },
        {
            dbColumn: 'is_taxable',
            recordColumn: '',
        },
        {
            dbColumn: 'expiration_date',
            recordColumn: '',
        },
        {
            dbColumn: 'manufacture_date',
            recordColumn: '',
        },
        {
            dbColumn: 'image_urls',
            recordColumn: '',
        },
        {
            dbColumn: 'supplier_name',
            recordColumn: '',
        },
        {
            dbColumn: 'supplier_code',
            recordColumn: '',
        },
        {
            dbColumn: 'created_by',
            recordColumn: '-1',
        },
        {
            dbColumn: 'synced',
            recordColumn: '0',
        },
        {
            dbColumn: 'created_at',
            recordColumn: 'created_at',
        },
        {
            dbColumn: 'updated_at',
            recordColumn: 'updated_at',
        },
    ],
    [ORDERS_DB]: [
        {
            dbColumn: 'uuid',
            recordColumn: '_id',
        },
        {
            dbColumn: 'ref_number',
            recordColumn: 'ref_number',
        },
        {
            dbColumn: 'transaction_uuid',
            recordColumn: '',
        },
        {
            dbColumn: 'product_uuid',
            recordColumn: 'product_id',
        },
        {
            dbColumn: 'quantity',
            recordColumn: 'quantity',
        },
        {
            dbColumn: 'purchase_price',
            recordColumn: 'purchase_price',
        },
        {
            dbColumn: 'sell_price',
            recordColumn: 'sell_price',
        },
        {
            dbColumn: 'synced',
            recordColumn: '0',
        },
        {
            dbColumn: 'created_at',
            recordColumn: 'createdAt',
        },
        {
            dbColumn: 'updated_at',
            recordColumn: '',
        },
    ],
    [TRANSACTIONS_DB]: [
        {
            dbColumn: 'uuid',
            recordColumn: '_id',
        },
        {
            dbColumn: 'ref_number',
            recordColumn: 'ref_number',
        },
        {
            dbColumn: 'discount',
            recordColumn: 'discount',
        },
        {
            dbColumn: 'customer_uuid',
            recordColumn: 'customer',
        },
        {
            dbColumn: 'subtotal',
            recordColumn: 'subtotal',
        },
        {
            dbColumn: 'tax',
            recordColumn: 'tax',
        },
        {
            dbColumn: 'date',
            recordColumn: 'date',
        },
        {
            dbColumn: 'payment_method_uuid',
            recordColumn: 'payment_id',
        },
        {
            dbColumn: 'transaction_id',
            recordColumn: 'transaction_id',
        },
        {
            dbColumn: 'phone_number',
            recordColumn: 'phone_number',
        },
        {
            dbColumn: 'payment_service_provider_uuid',
            recordColumn: 'service_provider_id',
        },
        {
            dbColumn: 'total',
            recordColumn: 'total',
        },
        {
            dbColumn: 'paid',
            recordColumn: 'paid',
        },
        {
            dbColumn: 'change_amount',
            recordColumn: 'change',
        },
        {
            dbColumn: 'till_uuid',
            recordColumn: '-1',
        },
        {
            dbColumn: 'user_uuid',
            recordColumn: '1746011936',
        },
        {
            dbColumn: 'client_uuid',
            recordColumn: '07d80a7c-8df6-460f-a8aa-d965bde36418',
        },
        {
            dbColumn: 'shop_uuid',
            recordColumn: 'f9816061-7941-4a94-b555-8d9567e4b346',
        },
        {
            dbColumn: 'status',
            recordColumn: 'completed',
        },
        {
            dbColumn: 'synced',
            recordColumn: '0',
        },
        {
            dbColumn: 'created_at',
            recordColumn: 'created_at',
        },
        {
            dbColumn: 'updated_at',
            recordColumn: 'updated_at',
        },
    ],
    [USERS_DB]: [
        {
            dbColumn: 'uuid',
            recordColumn: 'uuid'
        },
        {
            dbColumn: 'client_uuid',
            recordColumn: '07d80a7c-8df6-460f-a8aa-d965bde36418'
        },
        {
            dbColumn: 'shop_uuid',
            recordColumn: 'f9816061-7941-4a94-b555-8d9567e4b346'
        },
        {
            dbColumn: 'username',
            recordColumn: 'username'
        },
        {
            dbColumn: 'password',
            recordColumn: 'password'
        },
        {
            dbColumn: 'fullname',
            recordColumn: 'fullname'
        },
        {
            dbColumn: 'email',
            recordColumn: 'example@gmail.com'
        },
        {
            dbColumn: 'phone',
            recordColumn: '+265999888777'
        },
        {
            dbColumn: 'role_uuid',
            recordColumn: 'super-admin'
        },
        {
            dbColumn: 'status',
            recordColumn: 'status'
        },
        {
            dbColumn: 'accessible_shops',
            recordColumn: '["*"]'
        },
        {
            dbColumn: 'allowed_workstations',
            recordColumn: '["*"]'
        },
        {
            dbColumn: 'max_discount_percent',
            recordColumn: '0.00'
        },
        {
            dbColumn: 'can_override_prices',
            recordColumn: '0'
        },
        {
            dbColumn: 'pin_code',
            recordColumn: '1234'
        },
        {
            dbColumn: 'current_shop_uuid',
            recordColumn: 'f9816061-7941-4a94-b555-8d9567e4b346'
        },
        {
            dbColumn: 'last_login',
            recordColumn: 'last_login'
        },
        {
            dbColumn: 'last_logout',
            recordColumn: 'last_logged_out'
        },
        {
            dbColumn: 'password_changed_at',
            recordColumn: ''
        },
        {
            dbColumn: 'force_password_change',
            recordColumn: ''
        },
        {
            dbColumn: 'created_at',
            recordColumn: 'created_at'
        },
        {
            dbColumn: 'updated_at',
            recordColumn: 'updated_at'
        }
    ]
}
