// Explicit allowlist: never expose access codes, tokens or payout settings.
module.exports = {
  id: true, name: true, category: true, description: true,
  address: true, district: true, geo_lat: true, geo_lng: true,
  photo_url: true, rating_avg: true, rating_count: true, is_active: true,
};
