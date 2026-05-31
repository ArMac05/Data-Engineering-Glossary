import { z } from "zod";

export const termInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  shortDefinition: z.string().trim().min(1, "Short definition is required"),
  longExplanation: z.string().optional(),
  published: z.boolean().default(false),
  categoryIds: z.array(z.string()).default([]),
});
export type TermInput = z.infer<typeof termInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;
