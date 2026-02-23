/**
 * Migration: 20260208_01
 * Description: Make product SKU nullable and remove unique constraint
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260208_01',
    description: 'Make product SKU nullable and remove unique constraint',
    up: {
            sqlite: [
                `DROP INDEX IF EXISTS "sku"`,
                `DROP INDEX IF EXISTS "unique_branch_sku"`,
                `DROP INDEX IF EXISTS "products_sku_key"`,
                `DROP INDEX IF EXISTS "products_branch_id_sku_key"`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS migrate_sku_nullable`,
                `CREATE PROCEDURE migrate_sku_nullable()
                BEGIN
                    DECLARE col_exists INT DEFAULT 0;
                    DECLARE index_exists INT DEFAULT 0;
                    
                    -- Check if sku column exists in products table
                    SELECT COUNT(*) INTO col_exists 
                    FROM information_schema.columns 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'products' 
                    AND column_name = 'sku';
                    
                    -- Only proceed if sku column exists
                    IF col_exists > 0 THEN
                        -- Check and drop 'sku' index if exists
                        SELECT COUNT(*) INTO index_exists 
                        FROM information_schema.statistics 
                        WHERE table_schema = DATABASE() 
                        AND table_name = 'products' 
                        AND index_name = 'sku';
                        
                        IF index_exists > 0 THEN
                            ALTER TABLE products DROP INDEX sku;
                        END IF;
                        
                        -- Check and drop 'unique_branch_sku' index if exists
                        SELECT COUNT(*) INTO index_exists 
                        FROM information_schema.statistics 
                        WHERE table_schema = DATABASE() 
                        AND table_name = 'products' 
                        AND index_name = 'unique_branch_sku';
                        
                        IF index_exists > 0 THEN
                            ALTER TABLE products DROP INDEX unique_branch_sku;
                        END IF;
                        
                        -- Check and drop 'products_sku_key' index if exists (Prisma naming)
                        SELECT COUNT(*) INTO index_exists 
                        FROM information_schema.statistics 
                        WHERE table_schema = DATABASE() 
                        AND table_name = 'products' 
                        AND index_name = 'products_sku_key';
                        
                        IF index_exists > 0 THEN
                            ALTER TABLE products DROP INDEX products_sku_key;
                        END IF;
                    END IF;
                END`,
                `CALL migrate_sku_nullable()`,
                `DROP PROCEDURE IF EXISTS migrate_sku_nullable`,
            ],
        },
    down: {
            sqlite: [],
            mysql: [
                `SELECT 1`,
            ],
        },
};
