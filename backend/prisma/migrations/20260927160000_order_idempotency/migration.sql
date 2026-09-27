ALTER TABLE "Order" ADD COLUMN "idempotency_key" VARCHAR(64);
CREATE UNIQUE INDEX "Order_user_id_idempotency_key_key" ON "Order"("user_id", "idempotency_key");
