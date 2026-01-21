/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,branch_id,sale_number]` on the table `sales` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `sales_sale_number_key` ON `sales`;

-- CreateIndex
CREATE UNIQUE INDEX `sales_tenant_id_branch_id_sale_number_key` ON `sales`(`tenant_id`, `branch_id`, `sale_number`);
