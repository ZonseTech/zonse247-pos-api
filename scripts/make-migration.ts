#!/usr/bin/env npx ts-node
/**
 * Migration Generator Script
 * 
 * Creates new migration files similar to Laravel's artisan make:migration
 * 
 * Usage:
 *   npx ts-node scripts/make-migration.ts "migration_name"
 *   npx ts-node scripts/make-migration.ts "create_orders_table"
 *   npx ts-node scripts/make-migration.ts "add_status_to_users"
 *   
 * Or via task:
 *   task make:migration -- "migration_name"
 */

import fs from 'fs';
import path from 'path';

// Configuration
const MIGRATIONS_DIR = path.join(__dirname, '../src/databases/prisma/migrations-app');

/**
 * Generate a migration version in format YYYYMMDD_NN
 */
function generateMigrationVersion(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find existing migrations for today to get sequence number
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }

    const existingFiles = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.startsWith(datePrefix) && f.endsWith('.ts'));

    let sequenceNum = 1;
    if (existingFiles.length > 0) {
        const sequences = existingFiles
            .map(f => {
                const match = f.match(new RegExp(`^${datePrefix}_(\\d{2})`));
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter(n => n > 0);
        
        if (sequences.length > 0) {
            sequenceNum = Math.max(...sequences) + 1;
        }
    }

    return `${datePrefix}_${String(sequenceNum).padStart(2, '0')}`;
}

/**
 * Convert migration name to snake_case
 */
function toSnakeCase(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Generate the migration file content
 */
function generateMigrationContent(version: string, description: string): string {
    return `/**
 * Migration: ${version}
 * Description: ${description}
 * 
 * Created: ${new Date().toISOString()}
 * 
 * IMPORTANT:
 * - Never modify this migration once deployed
 * - Use IF NOT EXISTS / IF EXISTS for idempotent operations
 * - Test on both SQLite and MySQL
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '${version}',
    description: '${description}',
    up: {
        sqlite: [
            // SQLite-specific SQL statements
            // Example: \`ALTER TABLE "table_name" ADD COLUMN "column_name" TEXT\`,
        ],
        mysql: [
            // MySQL-specific SQL statements
            // Example: \`ALTER TABLE table_name ADD COLUMN column_name VARCHAR(255)\`,
        ],
    },
    down: {
        sqlite: [
            // SQLite rollback statements (optional)
        ],
        mysql: [
            // MySQL rollback statements (optional)
        ],
    },
};
`;
}

/**
 * Main execution
 */
function main(): void {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('❌ Error: Migration name is required');
        console.log('\nUsage:');
        console.log('  npx ts-node scripts/make-migration.ts "migration_name"');
        console.log('  task make:migration -- "create_users_table"');
        console.log('\nExamples:');
        console.log('  npx ts-node scripts/make-migration.ts "create_orders_table"');
        console.log('  npx ts-node scripts/make-migration.ts "add_status_to_users"');
        console.log('  npx ts-node scripts/make-migration.ts "create_product_variants_table"');
        process.exit(1);
    }

    const migrationName = args.join('_');
    const snakeName = toSnakeCase(migrationName);
    const version = generateMigrationVersion();
    const filename = `${version}_${snakeName}.ts`;
    const filePath = path.join(MIGRATIONS_DIR, filename);

    // Ensure migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }

    // Generate and write the migration file
    const content = generateMigrationContent(version, migrationName);
    fs.writeFileSync(filePath, content);

    console.log('\n✨ Migration created successfully!\n');
    console.log(`📄 File: ${path.relative(process.cwd(), filePath)}`);
    console.log(`🔖 Version: ${version}`);
    console.log(`📝 Description: ${migrationName}\n`);
    console.log('Next steps:');
    console.log(`  1. Edit the migration file to add your SQL statements`);
    console.log(`  2. Test on both SQLite and MySQL`);
    console.log(`  3. The migration will run automatically on app startup\n`);
}

main();
