import { v1 as uuid } from 'uuid';
import {
  ScriptAll,
  ScriptAny,
  ScriptNOfK,
  ScriptPubkey,
  SharedWalletSchema,
} from '../../../shared-wallets/docs/schema/shared-wallet-type-autogenerated';
import { paymentScriptKeyPath } from '../../../shared-wallets/utils';
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
        const { metadata, nativeScript } = JSON.parse(event.target?.result as string) as SharedWalletSchema;

        const isFileRecognized = !!metadata && !!nativeScript;

        if (!isFileRecognized) {
          reject({ message: FileErrorMessage.UNRECOGNIZED });
        }

        const { coSigners, sharedWalletName } = metadata;
        const { scripts } = nativeScript as ScriptAll | ScriptAny | ScriptNOfK;

        const ownHash = await getHashFromPublicKey(sharedKey, paymentScriptKeyPath);

        const matchedCosigner = scripts.find((script: ScriptPubkey) => script.pubkey === ownHash);

        if (!matchedCosigner) {
          reject({ message: FileErrorMessage.INVALID_KEY });
        }

        resolve({
          data: {
            coSigners: coSigners.map((cosigner) => ({ ...cosigner, id: uuid() })),
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
