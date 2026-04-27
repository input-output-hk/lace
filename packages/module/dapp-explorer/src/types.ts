import { z } from 'zod';

export const DappCategorySchemaWithUnknown = z.union([
  z.enum([
    'show all',
    'games',
    'defi',
    'collectibles',
    'marketplaces',
    'high-risk',
    'gambling',
    'exchanges',
    'social',
    'other',
  ]),
  z.string().min(1),
]);

export const DappLinkSchemaWithUnknown = z.union([
  z.enum([
    'discord',
    'facebook',
    'github',
    'instagram',
    'medium',
    'reddit',
    'telegram',
    'tiktok',
    'twitter',
    'youtube',
    'blog',
    'gitbook',
    'coingecko',
  ]),
  z.string().min(1),
]);
export type DappCategory = z.infer<typeof DappCategorySchemaWithUnknown>;
export type DappLink = z.infer<typeof DappLinkSchemaWithUnknown>;

export const DappRadarItemSchema = z
  .object({
    dappId: z.number(),
    name: z.string(),
    description: z.string(),
    fullDescription: z.string(),
    logo: z.string(),
    link: z.string(),
    website: z.string(),
    chains: z.string().array(),
    categories: z.string().array(),
    socialLinks: z
      .object({
        title: z.string(),
        type: DappLinkSchemaWithUnknown,
        url: z.string(),
      })
      .array(),
    metrics: z.object({
      transactions: z.number().nullable(),
      transactionsPercentageChange: z.number().nullable(),
      uaw: z.number().nullable(),
      uawPercentageChange: z.number().nullable(),
      volume: z.number().nullable(),
      volumePercentageChange: z.number().nullable(),
      balance: z.number().nullable(),
      balancePercentageChange: z.number().nullable(),
    }),
    tags: z
      .object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      })
      .array(),
    isActive: z.boolean(),
  })
  .passthrough(); // Don't fail validation, use this to send sentry errors so we know to modify the schema when new fields are added/shape changes

export type DAppRadarItem = z.infer<typeof DappRadarItemSchema>;

export const DappRadarDappFetchResponse = z.object({
  success: z.boolean(),
  results: DappRadarItemSchema.array(),
});

export type StoredDappData = {
  results: DAppRadarItem[];
  cachedUntil: Date;
};
