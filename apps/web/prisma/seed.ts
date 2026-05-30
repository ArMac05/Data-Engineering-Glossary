import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  {
    slug: "streaming",
    name: "Streaming",
    description: "Real-time movement and processing of data in motion.",
  },
  {
    slug: "transformation",
    name: "Transformation",
    description: "Shaping, cleaning, and modeling raw data.",
  },
  {
    slug: "data-warehouse",
    name: "Data Warehouse",
    description: "Analytical storage optimized for querying.",
  },
  {
    slug: "pipelines",
    name: "Pipelines",
    description: "Orchestrated workflows that move and process data.",
  },
  {
    slug: "storage",
    name: "Storage",
    description: "Where data lives at rest.",
  },
];

const terms = [
  {
    slug: "kafka",
    name: "Apache Kafka",
    shortDefinition:
      "A distributed event-streaming platform for high-throughput, fault-tolerant data pipelines.",
    longExplanation:
      "Apache Kafka is a distributed commit log that lets systems publish and subscribe to streams of records. It is the backbone of many real-time data architectures, decoupling producers from consumers and retaining events durably so multiple downstream systems can read them independently.",
    categorySlug: "streaming",
  },
  {
    slug: "dbt",
    name: "dbt (data build tool)",
    shortDefinition:
      "A framework for transforming data in the warehouse using version-controlled SQL.",
    longExplanation:
      "dbt lets analysts and engineers build modular, tested, version-controlled transformations as SQL `SELECT` statements. It handles dependency ordering, materialization, and documentation, bringing software-engineering practices to the transformation layer of the modern data stack.",
    categorySlug: "transformation",
  },
  {
    slug: "snowflake",
    name: "Snowflake",
    shortDefinition:
      "A cloud data warehouse that separates storage from compute for elastic scaling.",
    longExplanation:
      "Snowflake is a fully managed cloud data warehouse whose key architectural idea is the separation of storage and compute, so each can scale independently. Multiple virtual warehouses can query the same data concurrently without contention.",
    categorySlug: "data-warehouse",
  },
  {
    slug: "etl",
    name: "ETL (Extract, Transform, Load)",
    shortDefinition:
      "A pattern for moving data: extract from sources, transform it, then load into a destination.",
    longExplanation:
      "ETL describes the classic sequence of extracting data from source systems, transforming it into a clean, modeled shape, and loading it into a target store. Its modern variant, ELT, loads raw data first and transforms it inside the warehouse (often with tools like dbt).",
    categorySlug: "pipelines",
  },
  {
    slug: "data-lake",
    name: "Data Lake",
    shortDefinition:
      "A centralized repository that stores raw structured and unstructured data at any scale.",
    longExplanation:
      "A data lake stores raw data in its native format — structured, semi-structured, or unstructured — until it is needed. It favors schema-on-read over schema-on-write, trading upfront modeling for flexibility, and often serves as the landing zone feeding warehouses and analytics.",
    categorySlug: "storage",
  },
];

const relatedPairs = [
  { from: "etl", to: "dbt", type: "related" },
  { from: "kafka", to: "etl", type: "related" },
  { from: "data-lake", to: "snowflake", type: "related" },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }

  for (const { categorySlug, ...data } of terms) {
    const term = await prisma.term.upsert({
      where: { slug: data.slug },
      update: { ...data, publishedAt: new Date() },
      create: { ...data, publishedAt: new Date() },
    });
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: categorySlug },
    });
    await prisma.termCategory.upsert({
      where: {
        termId_categoryId: { termId: term.id, categoryId: category.id },
      },
      update: {},
      create: { termId: term.id, categoryId: category.id },
    });
  }

  for (const r of relatedPairs) {
    const from = await prisma.term.findUniqueOrThrow({
      where: { slug: r.from },
    });
    const to = await prisma.term.findUniqueOrThrow({ where: { slug: r.to } });
    await prisma.relatedTerm.upsert({
      where: {
        termId_relatedTermId_relationType: {
          termId: from.id,
          relatedTermId: to.id,
          relationType: r.type,
        },
      },
      update: {},
      create: { termId: from.id, relatedTermId: to.id, relationType: r.type },
    });
  }

  const count = await prisma.term.count();
  console.log(`Seed complete — ${count} terms in the database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
