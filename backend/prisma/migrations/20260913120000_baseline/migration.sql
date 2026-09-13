-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VenueCategory" AS ENUM ('BAKERY', 'PREPARED', 'SUPERMARKET', 'CAFE', 'DESSERT', 'OTHER');

-- CreateEnum
CREATE TYPE "BoxType" AS ENUM ('SURPRISE', 'ITEMIZED');

-- CreateEnum
CREATE TYPE "BoxStatus" AS ENUM ('ACTIVE', 'SOLD_OUT', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RESERVED', 'PAID', 'PICKED_UP', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegram_id" BIGINT,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "username" TEXT,
    "photo_url" TEXT,
    "avatar_preset" TEXT,
    "phone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "boxes_saved" INTEGER NOT NULL DEFAULT 0,
    "money_saved" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "VenueCategory" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL DEFAULT '',
    "geo_lat" DOUBLE PRECISION NOT NULL,
    "geo_lng" DOUBLE PRECISION NOT NULL,
    "photo_url" TEXT,
    "contact_phone" TEXT NOT NULL,
    "kaspi_info" TEXT NOT NULL DEFAULT '',
    "payout_details" TEXT NOT NULL DEFAULT '',
    "venue_token" TEXT NOT NULL,
    "access_code" TEXT,
    "default_pickup_start" TEXT,
    "default_pickup_end" TEXT,
    "commission_pct" INTEGER NOT NULL DEFAULT 20,
    "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Box" (
    "id" SERIAL NOT NULL,
    "venue_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" "BoxType" NOT NULL,
    "description" TEXT NOT NULL,
    "items" TEXT,
    "original_price" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "qty_total" INTEGER NOT NULL,
    "qty_left" INTEGER NOT NULL,
    "pickup_start" TEXT NOT NULL,
    "pickup_end" TEXT NOT NULL,
    "pickup_date" DATE NOT NULL,
    "photo_url" TEXT,
    "status" "BoxStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "box_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "amount" INTEGER NOT NULL,
    "commission" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'RESERVED',
    "pickup_code" TEXT NOT NULL,
    "reserved_until" TIMESTAMP(3) NOT NULL,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "venue_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "venue_id" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegram_id_key" ON "User"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_venue_token_key" ON "Venue"("venue_token");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_access_code_key" ON "Venue"("access_code");

-- CreateIndex
CREATE INDEX "Box_status_pickup_date_idx" ON "Box"("status", "pickup_date");

-- CreateIndex
CREATE INDEX "Box_venue_id_pickup_date_idx" ON "Box"("venue_id", "pickup_date");

-- CreateIndex
CREATE INDEX "Order_user_id_created_at_idx" ON "Order"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "Order_status_reserved_until_idx" ON "Order"("status", "reserved_until");

-- CreateIndex
CREATE INDEX "Order_pickup_code_idx" ON "Order"("pickup_code");

-- CreateIndex
CREATE INDEX "Order_box_id_idx" ON "Order"("box_id");

-- CreateIndex
CREATE INDEX "Favorite_venue_id_idx" ON "Favorite"("venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_user_id_venue_id_key" ON "Favorite"("user_id", "venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_order_id_key" ON "Rating"("order_id");

-- CreateIndex
CREATE INDEX "Rating_venue_id_idx" ON "Rating"("venue_id");

-- CreateIndex
CREATE INDEX "Rating_user_id_idx" ON "Rating"("user_id");

-- AddForeignKey
ALTER TABLE "Box" ADD CONSTRAINT "Box_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "Box"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

