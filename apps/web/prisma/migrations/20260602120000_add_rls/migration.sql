-- Enable Row Level Security on every table
ALTER TABLE "terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "term_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "related_terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "term_enrichments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "term_embeddings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_attempts" ENABLE ROW LEVEL SECURITY;

-- Public read access on the glossary tables (no write policies = no anon writes)
CREATE POLICY "public_read" ON "terms" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "categories" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "term_categories" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "related_terms" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "term_enrichments" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "term_embeddings" FOR SELECT TO anon, authenticated USING (true);

-- quiz_attempts: RLS enabled, NO policy → fully blocked from anon (future user data)