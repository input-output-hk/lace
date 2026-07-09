import { z } from 'zod';

// ─── Category ───────────────────────────────────────────────────────────────

export const CardanoCubeCategorySchema = z.object({
  id: z.number(),
  parent_id: z.number().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  projects_count: z.number(),
  ancestry_depth: z.number().nullable().optional(),
  ancestry: z.string().nullable().optional(),
  updated_at: z.string(),
});

export type CardanoCubeCategory = z.infer<typeof CardanoCubeCategorySchema>;

// ─── Project (API shape) ─────────────────────────────────────────────────────

export const CardanoCubeProjectSchema = z.object({
  name: z.string(),
  slug: z.string(),
  short_description: z.string().nullable().optional(),
  logos: z.object({
    small: z.string().nullable(),
    medium: z.string().nullable(),
    large: z.string().nullable(),
  }),
  rating: z.object({
    vote_count: z.number(),
    average_rating: z.number().nullable(),
    star_count: z.number(),
  }),
  website: z.string().nullable().optional(),
  active_status: z.string(),
  scam_status: z.string(),
  twitter: z.string().nullable().optional(),
  github: z.string().nullable().optional(),
  discord: z.string().nullable().optional(),
  telegram: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  reddit: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  updated_at: z.string(),
  main_category: CardanoCubeCategorySchema.nullable().optional(),
  additional_categories: CardanoCubeCategorySchema.array().default([]),
});

export type CardanoCubeProject = z.infer<typeof CardanoCubeProjectSchema>;

// ─── Pagination ──────────────────────────────────────────────────────────────

export const CardanoCubePaginationSchema = z.object({
  next: z.number().nullable(),
  pages: z.number(),
  count: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const CardanoCubeProjectsResponseSchema = z.object({
  projects: CardanoCubeProjectSchema.array(),
  pagination: CardanoCubePaginationSchema.passthrough(),
});

export const CardanoCubeCategoriesResponseSchema = z.object({
  categories: CardanoCubeCategorySchema.array(),
  pagination: CardanoCubePaginationSchema.passthrough(),
});

// ─── Internal DappItem (merged, with chain) ──────────────────────────────────

export const DappItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  website: z.string().nullable(),
  active_status: z.string(),
  scam_status: z.string(),
  rating: z.object({
    vote_count: z.number(),
    average_rating: z.number().nullable(),
    star_count: z.number(),
  }),
  chain: z.string(),
  categories: z.string().array(),
  socialLinks: z.object({ type: z.string(), url: z.string() }).array(),
  updated_at: z.string(),
});

export type DappItem = z.infer<typeof DappItemSchema>;

// ─── Category filter type ────────────────────────────────────────────────────

export const DappCategorySchemaWithUnknown = z.union([
  z.literal('show all'),
  z.string().min(1),
]);

export type DappCategory = z.infer<typeof DappCategorySchemaWithUnknown>;
