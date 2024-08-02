/* eslint-disable unicorn/consistent-destructuring */
import { v1 as uuid } from 'uuid';
import { z } from 'zod';
import { PubkeyScript } from '../../../shared-wallets/docs/schema/shared-wallet.schema';
import { FileErrorMessage, FileValidationError } from '../../../shared-wallets/types';
import { paymentScriptKeyPath, schemaValidator } from '../../../shared-wallets/utils';
import { CoSigner } from '../creation-flow';
import { CreateWalletParams } from './types';
import { getHashFromPublicKey, getQuorumRulesByTag } from './utils';

export const validateJson = (
  file: File,
  sharedKey: string,
): Promise<{ data: CreateWalletParams; error?: FileValidationError }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', async (event) => {
      try {
        const parsedResult = schemaValidator.safeParse(JSON.parse(event.target?.result as string));

        if (parsedResult.error) {
          reject({ message: FileErrorMessage.UNRECOGNIZED });
        }

        const { metadata, nativeScript } = parsedResult.data;
        const { coSigners, sharedWalletName } = metadata;
        const { scripts } = nativeScript;

        const ownHash = await getHashFromPublicKey(sharedKey, paymentScriptKeyPath);

        const matchedCosigner = scripts.find((script: PubkeyScript) => script.pubkey === ownHash);

        if (!matchedCosigner) {
          reject({ message: FileErrorMessage.INVALID_KEY });
        }

        resolve({
          data: {
            coSigners: coSigners.map((cosigner: CoSigner) => ({ ...cosigner, id: uuid() })),
            name: sharedWalletName,
            quorumRules: getQuorumRulesByTag(nativeScript.tag, nativeScript.tag === 'n_of_k' && nativeScript.n),
          },
        });
      } catch (error) {
        reject({ message: (error as z.ZodError).issues[0].message });
      }
    });

    reader.readAsText(file);
  });
