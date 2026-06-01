import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw, embedQueryMock } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  embedQueryMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock("@/lib/embedding", () => ({ embedQuery: embedQueryMock }));

import { semanticSearch } from "@/lib/semantic-search";

describe("semanticSearch", () => {
  beforeEach(() => {
    queryRaw.mockReset();
    embedQueryMock.mockReset();
  });

  it("embeds the query and builds a vector-similarity query", async () => {
    embedQueryMock.mockResolvedValue([0.1, 0.2, 0.3]);
    queryRaw.mockResolvedValue([
      {
        id: "1",
        slug: "kafka",
        name: "Apache Kafka",
        shortDefinition: "streaming",
      },
    ]);

    const results = await semanticSearch("streaming data");

    expect(embedQueryMock).toHaveBeenCalledWith("streaming data");
    expect(results).toHaveLength(1);

    const [strings, vectorParam] = queryRaw.mock.calls[0];
    const sql = (strings as string[]).join("?");
    expect(sql).toContain("<=>");
    expect(sql).toContain("::vector");
    expect(sql).toContain("LIMIT");
    expect(vectorParam).toBe("[0.1,0.2,0.3]");
  });
});
