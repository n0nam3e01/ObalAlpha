# Öbal project rules

- Keep the existing React/Vite frontend and Express/Prisma backend.
- Prefer plain CSS, native browser features and existing helpers.
- Google Maps is the only map surface. Do not add 2GIS or Leaflet.
- Customer copy is Russian first, plain and specific.
- Use the warm oat, charcoal and apricot token palette in `frontend/src/styles/tokens.css`.
- Preserve password validation, rate limits, authorization checks and database constraints.
- Supabase provides PostgreSQL now. Supabase Auth can replace local JWT later only as a deliberate migration.
- Telegram bot integration is out of scope until the ordering MVP is deployed.
