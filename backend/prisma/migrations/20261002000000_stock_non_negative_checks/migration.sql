-- Defence in depth: the database itself refuses negative stock, whatever code path
-- writes it. NOT VALID = enforced for every new INSERT/UPDATE without scanning
-- (or failing on) existing rows. Prisma does not model CHECK constraints, so
-- these live only in migrations.

ALTER TABLE "stock"
  ADD CONSTRAINT "stock_emk1_remaining_non_negative" CHECK ("emk1Remaining" >= 0) NOT VALID,
  ADD CONSTRAINT "stock_emk2_remaining_non_negative" CHECK ("emk2Remaining" >= 0) NOT VALID,
  ADD CONSTRAINT "stock_emk3_remaining_non_negative" CHECK ("emk3Remaining" >= 0) NOT VALID;

ALTER TABLE "central_warehouse"
  ADD CONSTRAINT "central_emk1_remaining_non_negative" CHECK ("emk1Remaining" >= 0) NOT VALID,
  ADD CONSTRAINT "central_emk2_remaining_non_negative" CHECK ("emk2Remaining" >= 0) NOT VALID,
  ADD CONSTRAINT "central_emk3_remaining_non_negative" CHECK ("emk3Remaining" >= 0) NOT VALID;
