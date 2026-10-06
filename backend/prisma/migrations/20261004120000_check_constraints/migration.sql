-- Business invariants that the API already enforces, now also guarded by the
-- database so a script, admin console or future route cannot break them.
-- NOT VALID: checked for every new or updated row, existing rows are not
-- rescanned, so a deploy never fails on legacy data. After checking production
-- data, run prisma/sql/validate_constraints.sql once to validate old rows too.

ALTER TABLE "Box"
  ADD CONSTRAINT "Box_price_positive" CHECK ("price" > 0) NOT VALID,
  ADD CONSTRAINT "Box_price_below_original" CHECK ("price" < "original_price") NOT VALID,
  ADD CONSTRAINT "Box_qty_range" CHECK ("qty_left" >= 0 AND "qty_left" <= "qty_total" AND "qty_total" <= 1000) NOT VALID,
  ADD CONSTRAINT "Box_pickup_format" CHECK ("pickup_start" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "pickup_end" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') NOT VALID,
  ADD CONSTRAINT "Box_pickup_order" CHECK ("pickup_end" > "pickup_start") NOT VALID;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_qty_range" CHECK ("qty" BETWEEN 1 AND 10) NOT VALID,
  ADD CONSTRAINT "Order_money_non_negative" CHECK ("amount" >= 0 AND "commission" >= 0 AND "commission" <= "amount" AND "service_fee" >= 0 AND "delivery_fee" >= 0) NOT VALID;

ALTER TABLE "Rating"
  ADD CONSTRAINT "Rating_stars_range" CHECK ("stars" BETWEEN 1 AND 5) NOT VALID;

ALTER TABLE "Venue"
  ADD CONSTRAINT "Venue_commission_range" CHECK ("commission_pct" BETWEEN 0 AND 100) NOT VALID,
  ADD CONSTRAINT "Venue_geo_range" CHECK ("geo_lat" BETWEEN -90 AND 90 AND "geo_lng" BETWEEN -180 AND 180) NOT VALID;

ALTER TABLE "User"
  ADD CONSTRAINT "User_impact_non_negative" CHECK ("boxes_saved" >= 0 AND "money_saved" >= 0) NOT VALID;
