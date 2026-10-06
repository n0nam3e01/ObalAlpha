-- Run once after 20261004120000_check_constraints, when existing rows are known
-- to be clean. A failure names the constraint; fix those rows and rerun.
ALTER TABLE "Box" VALIDATE CONSTRAINT "Box_price_positive";
ALTER TABLE "Box" VALIDATE CONSTRAINT "Box_price_below_original";
ALTER TABLE "Box" VALIDATE CONSTRAINT "Box_qty_range";
ALTER TABLE "Box" VALIDATE CONSTRAINT "Box_pickup_format";
ALTER TABLE "Box" VALIDATE CONSTRAINT "Box_pickup_order";
ALTER TABLE "Order" VALIDATE CONSTRAINT "Order_qty_range";
ALTER TABLE "Order" VALIDATE CONSTRAINT "Order_money_non_negative";
ALTER TABLE "Rating" VALIDATE CONSTRAINT "Rating_stars_range";
ALTER TABLE "Venue" VALIDATE CONSTRAINT "Venue_commission_range";
ALTER TABLE "Venue" VALIDATE CONSTRAINT "Venue_geo_range";
ALTER TABLE "User" VALIDATE CONSTRAINT "User_impact_non_negative";
