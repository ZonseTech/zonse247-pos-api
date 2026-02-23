#!/bin/bash
# DEPRECATED: Use the new Laravel-style migration command instead
#
# Create new migration:
#   task make:migration -- "migration_name"
#
# Examples:
#   task make:migration -- "create_orders_table"
#   task make:migration -- "add_status_to_users"
#
# List migrations:
#   task migrate:list
#
# Check migration status:
#   task migrate:status

echo "⚠️  This script is deprecated!"
echo ""
echo "Use the new Laravel-style migration command instead:"
echo ""
echo "  task make:migration -- \"your_migration_name\""
echo ""
echo "Examples:"
echo "  task make:migration -- \"create_orders_table\""
echo "  task make:migration -- \"add_status_to_users\""
echo ""
echo "Other commands:"
echo "  task migrate:list    - List all migrations"
echo "  task migrate:status  - Check migration status"
echo ""

# If arguments provided, forward to new script
if [ $# -gt 0 ]; then
    echo "Forwarding to new migration generator..."
    echo ""
    npx ts-node scripts/make-migration.ts "$@"
fi
