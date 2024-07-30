/* eslint-disable unicorn/consistent-destructuring */
import { v1 as uuid } from 'uuid';
import { PubkeyScript, schemaValidator } from '../../../shared-wallets/docs/schema/shared-wallet.schema';
import { paymentScriptKeyPath } from '../../../shared-wallets/utils';
import { CoSigner } from '../creation-flow';
import { CreateWalletParams, FileErrorMessage, FileValidationError } from './types';
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
        reject(error);
      }
    });

    reader.readAsText(file);
  });
