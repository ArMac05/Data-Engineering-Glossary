-- Enforce case-insensitive uniqueness on term names (mirrors the existing
-- unique slug). This is a functional index, which Prisma cannot model in
-- schema.prisma, so it lives only here — apply with `prisma migrate deploy`
-- and never accept the drift detector's suggestion to drop it.
CREATE UNIQUE INDEX "terms_name_lower_key" ON "terms" (lower("name"));
