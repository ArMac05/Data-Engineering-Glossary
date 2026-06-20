-- Optional admin override for which Wikipedia article a term links to
-- (disambiguates terms like "Snowflake"). NULL = let the pipeline decide.
ALTER TABLE "terms" ADD COLUMN "wikipedia_title" TEXT;
