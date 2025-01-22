import { z, ZodIssueCode } from 'zod';
import { DeepRequired } from 'utility-types';

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

// currently schema.parse() method returns partially valid type - all properties are optional
// so we use extra types with DeepRequired, these types can be removed after Lace uses strict null checks

export const networksEnumSchema = z.enum(['preview', 'preprod', 'mainnet', 'sanchonet']);
export type NetworksEnumSchema = z.infer<typeof networksEnumSchema>;

const commonSchema = z.object({
  allowedNetworks: z.array(networksEnumSchema)
});
export type FeatureFlagCommonSchema = DeepRequired<z.infer<typeof commonSchema>>;

const dappExplorerSchema = commonSchema.merge(
  z.object({
    disallowedDapps: z.object({
      legalIssues: z.array(z.number()),
      connectivityIssues: z.array(z.number())
    })
  })
);
export type FeatureFlagDappExplorerSchema = DeepRequired<z.infer<typeof dappExplorerSchema>>;

export const featureFlagSchema = {
  common: z.preprocess(parseJsonPreprocessor, commonSchema),
  dappExplorer: z.preprocess(parseJsonPreprocessor, dappExplorerSchema)
};
