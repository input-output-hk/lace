import { z, ZodIssueCode } from 'zod';

const parseJsonPreprocessor = (value: unknown, ctx: z.RefinementCtx) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: (error as Error).message
      });
    }
  }

  return value;
};

export enum NetworkName {
  preview = 'preview',
  preprod = 'preprod',
  mainnet = 'mainnet',
  sanchonet = 'sanchonet'
}

export const networksEnumSchema = z.enum(Object.values(NetworkName) as [NetworkName, ...NetworkName[]]);
export type NetworksEnumSchema = z.infer<typeof networksEnumSchema>;

export const commonSchema = z.object({
  allowedNetworks: z.array(networksEnumSchema)
});

export const dappExplorerSchema = commonSchema.merge(
  z.object({
    disallowedDapps: z.object({
      legalIssues: z.array(z.number()),
      connectivityIssues: z.array(z.number())
    }),
    disallowedCategories: z.object({
      legalIssues: z.array(z.string())
    })
  })
);

export const glacierDropSchema = commonSchema.merge(
  z.object({
    learnMoreUrl: z.string().url()
  })
);

export const featureFlagSchema = {
  common: z.preprocess(parseJsonPreprocessor, commonSchema),
  dappExplorer: z.preprocess(parseJsonPreprocessor, dappExplorerSchema),
  glacierDrop: z.preprocess(parseJsonPreprocessor, glacierDropSchema)
};
