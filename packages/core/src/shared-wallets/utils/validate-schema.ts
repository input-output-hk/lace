import { z } from 'zod';
import { schema } from '../docs/schema/shared-wallet.schema';
import { FileErrorMessage, SharedWalletData } from '../types';

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
