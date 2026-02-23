# Application Migrations

This directory contains database migrations that are executed at runtime (similar to Laravel migrations).

## Creating a New Migration

Use the task command to create a new migration:

```bash
# Create a new migration
task make:migration -- "add_column_to_users"

# Or with description
task make:migration -- "create_orders_table"
```

This will create a new migration file in the `migrations-app/` directory with the format:
`YYYYMMDD_NN_migration_name.ts`

## Migration Structure

Each migration file exports a `Migration` object with:
- `version`: Auto-generated timestamp-based version (e.g., `20260223_01`)
- `description`: Human-readable description
- `up`: SQL statements to apply the migration (supports both SQLite and MySQL)
- `down`: (Optional) SQL statements to rollback the migration

## Example Migration

```typescript
import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260223_01',
    description: 'Add status column to orders table',
    up: {
        sqlite: [
            `ALTER TABLE "orders" ADD COLUMN "status" TEXT DEFAULT 'pending'`,
        ],
        mysql: [
            `ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'pending'`,
        ],
    },
    down: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN easily
        ],
        mysql: [
            `ALTER TABLE orders DROP COLUMN status`,
        ],
    },
};
```

## Running Migrations

Migrations are automatically run on application startup. The migration system:
1. Detects pending migrations
2. Creates a backup (SQLite only)
3. Applies migrations in order
4. Updates the schema version

## Best Practices

1. **Never modify existing migrations** once they've been deployed
2. **Always provide database-specific SQL** for cross-platform support
3. **Use idempotent SQL** where possible (IF NOT EXISTS, etc.)
4. **Test migrations** on both SQLite and MySQL
5. **Keep migrations small** and focused on one change
