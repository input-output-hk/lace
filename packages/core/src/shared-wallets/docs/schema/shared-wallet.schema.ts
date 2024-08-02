/* eslint-disable no-magic-numbers */
import { z } from 'zod';
import { FileErrorMessage } from '@src/shared-wallets/types';

const uint32Schema = z.number().int().nonnegative().max(4_294_967_295);

// Schema for a pubkey script, common in all quorum variants
const pubkeyScriptSchema = z.object({
  pubkey: z.string(),
  tag: z.literal('pubkey'),
});

export type PubkeyScript = z.infer<typeof pubkeyScriptSchema>;

const scriptsArraySchema = z.array(pubkeyScriptSchema);

const nativeScriptSchema = z.union([
  z
    .object({
      tag: z.literal('all'),
    })
    .and(
      z.object({
        scripts: scriptsArraySchema,
      }),
    ),
  z
    .object({
      tag: z.literal('any'),
    })
    .and(
      z.object({
        scripts: scriptsArraySchema,
      }),
    ),
  z
    .object({
      n: uint32Schema,
      tag: z.literal('n_of_k'),
    })
    .and(
      z.object({
        scripts: scriptsArraySchema,
      }),
    ),
]);

export type NativeScript = z.infer<typeof nativeScriptSchema>;

export const schema = z
  .object({
    metadata: z
      .object({
        coSigners: z
          .array(
            z.object({
              name: z.string().max(20, 'Name should not exceed 20 characters').describe('The name of the participant'),
              sharedWalletKey: z.string().describe('The Ed25519KeyHash of the participant'),
            }),
          )
          .nonempty('At least one co-signer is required')
          .describe('The list of participants in the shared wallet'),
        sharedWalletName: z
          .string()
          .max(20, 'Shared wallet name should not exceed 20 characters')
          .describe('The name of the shared wallet')
          .optional(),
      })
      .catchall(z.any()),
    nativeScript: nativeScriptSchema,
  })
  .strict()
  .describe('Shared wallet structure based on CIP-1854');

export type SharedWalletData = z.infer<typeof schema>;

// Preprocess to ensure metadata and nativeScript are present
export const schemaValidator = z.preprocess((data) => {
  const parsedData = data as SharedWalletData;

  if (!parsedData.metadata || !parsedData.nativeScript) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: FileErrorMessage.UNRECOGNIZED,
        path: [],
      },
    ]);
  }
  return parsedData;
}, schema);
