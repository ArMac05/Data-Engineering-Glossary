-- Enable pgvector before any vector(...) column is created
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "terms" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_definition" TEXT NOT NULL,
    "long_explanation" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "search_vector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("short_definition", '')), 'B') ||
        setweight(to_tsvector('english', coalesce("long_explanation", '')), 'C')
    ) STORED,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_categories" (
    "term_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "term_categories_pkey" PRIMARY KEY ("term_id","category_id")
);

-- CreateTable
CREATE TABLE "related_terms" (
    "id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "related_term_id" TEXT NOT NULL,
    "relation_type" TEXT NOT NULL,

    CONSTRAINT "related_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_enrichments" (
    "term_id" TEXT NOT NULL,
    "examples" JSONB NOT NULL DEFAULT '[]',
    "clarification" TEXT,
    "wikipedia_summary" TEXT,
    "wikipedia_url" TEXT,
    "model_version" TEXT NOT NULL,
    "enriched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_enrichments_pkey" PRIMARY KEY ("term_id")
);

-- CreateTable
CREATE TABLE "term_embeddings" (
    "term_id" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "model_version" TEXT NOT NULL,
    "embedded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_embeddings_pkey" PRIMARY KEY ("term_id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "user_id" TEXT,
    "result" TEXT NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "terms_slug_key" ON "terms"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "term_categories_category_id_idx" ON "term_categories"("category_id");

-- CreateIndex
CREATE INDEX "related_terms_related_term_id_idx" ON "related_terms"("related_term_id");

-- CreateIndex
CREATE UNIQUE INDEX "related_terms_term_id_related_term_id_relation_type_key" ON "related_terms"("term_id", "related_term_id", "relation_type");

-- CreateIndex
CREATE INDEX "quiz_attempts_term_id_idx" ON "quiz_attempts"("term_id");

-- AddForeignKey
ALTER TABLE "term_categories" ADD CONSTRAINT "term_categories_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_categories" ADD CONSTRAINT "term_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "related_terms" ADD CONSTRAINT "related_terms_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "related_terms" ADD CONSTRAINT "related_terms_related_term_id_fkey" FOREIGN KEY ("related_term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_enrichments" ADD CONSTRAINT "term_enrichments_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_embeddings" ADD CONSTRAINT "term_embeddings_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Full-text search index over the generated tsvector
CREATE INDEX "terms_search_vector_idx" ON "terms" USING GIN ("search_vector");

-- Vector similarity index (HNSW, cosine distance) for semantic search
CREATE INDEX "term_embeddings_embedding_idx" ON "term_embeddings" USING hnsw ("embedding" vector_cosine_ops);