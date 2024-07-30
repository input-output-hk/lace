/* eslint-disable no-magic-numbers */
import { z } from 'zod';

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

const schema = z
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
        message: "File is unrecognized: 'metadata' and 'nativeScript' fields are required.",
        path: [],
      },
    ]);
  }
  return parsedData;
}, schema);

// Usage example

/* 
const exampleData = {
  metadata: {
    sharedWalletName: "SharedWallet",
    coSigners: [
      { name: "Alice", publicKey: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0" },
      { name: "Bob", publicKey: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab" }
    ]
  },
  nativeScript: {
    tag: "all",
    scripts: [
      { tag: "pubkey", pubkey: "8abf8e53f1532d344cbeae9be1ce14b6e9b70c22db91e6deab81b90b2f3a5904" },
      { tag: "pubkey", pubkey: "21a6fc6f0463e07aa9b28bd81eb7fe2e6fec81050d7dae586381e4356a5fe9d0" }
    ]
  }
};

// Validation example 

try {
  sharedWalletJsonSchema.parse(exampleData);
  console.log("Data is valid!");
} catch (e: any) {
  console.error("Validation error:", e.errors);
}

*/
