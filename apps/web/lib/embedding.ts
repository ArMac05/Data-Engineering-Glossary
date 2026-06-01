import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIM = 768;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return client;
}

export async function embedQuery(text: string): Promise<number[]> {
  const res = await getClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIM },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Gemini returned no embedding");
  }
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return norm ? values.map((v) => v / norm) : values;
}
