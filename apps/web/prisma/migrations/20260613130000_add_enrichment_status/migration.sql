-- Track each term's enrichment state: 'pending' | 'enriched' | 'failed'.
ALTER TABLE "terms"
  ADD COLUMN "enrichment_status" TEXT NOT NULL DEFAULT 'pending';

-- Backfill: terms that already have an enrichment row are 'enriched'.
UPDATE "terms"
  SET "enrichment_status" = 'enriched'
  WHERE "id" IN (SELECT "term_id" FROM "term_enrichments");
