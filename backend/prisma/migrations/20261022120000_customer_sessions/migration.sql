BEGIN;
CREATE TABLE "CustomerSession" (
  "id" TEXT NOT NULL,
  "user_id" INTEGER NOT NULL,
  "refresh_hash" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CustomerSession_refresh_hash_key" ON "CustomerSession"("refresh_hash");
CREATE INDEX "CustomerSession_user_id_revoked_at_idx" ON "CustomerSession"("user_id", "revoked_at");
CREATE INDEX "CustomerSession_expires_at_idx" ON "CustomerSession"("expires_at");
-- Supabase REST roles must never read or write the session registry.
-- The Prisma database owner remains the only application data surface.
ALTER TABLE "CustomerSession" ENABLE ROW LEVEL SECURITY;
COMMIT;
