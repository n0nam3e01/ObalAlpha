CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN');
ALTER TABLE "User" ADD COLUMN "public_id" TEXT, ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';
UPDATE "User" SET "public_id" = 'OB-' || LPAD(id::text, 8, '0') WHERE "public_id" IS NULL;
CREATE UNIQUE INDEX "User_public_id_key" ON "User"("public_id");
ALTER TABLE "Venue" ADD COLUMN "is_approved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Box" ADD COLUMN "is_approved" BOOLEAN NOT NULL DEFAULT true;
