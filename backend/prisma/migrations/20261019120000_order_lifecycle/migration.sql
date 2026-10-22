ALTER TABLE "Order"
  ADD COLUMN "picked_up_at" TIMESTAMP(3),
  ADD COLUMN "cancelled_at" TIMESTAMP(3),
  ADD COLUMN "cancelled_by" VARCHAR(16),
  ADD COLUMN "cancellation_reason" VARCHAR(500);

-- Old collection times are unknown. Do not backfill from booking time.
CREATE INDEX "Order_status_picked_up_at_idx" ON "Order"("status", "picked_up_at");

ALTER TABLE "Order" ADD CONSTRAINT "Order_cancelled_by_check"
  CHECK ("cancelled_by" IS NULL OR "cancelled_by" IN ('CUSTOMER', 'VENUE'));
