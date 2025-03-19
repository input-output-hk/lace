import { Wallet } from '@lace/cardano';
import { logger } from '@lace/common';
import type {
  NativeScript,
  ScriptPubkey,
  SharedWalletSchema,
} from '../../../docs/schema/shared-wallet-type-autogenerated';
import { paymentScriptKeyPath } from '@src/shared-wallets/utils';
import { CreationFlowState } from '../../creation-flow/state-and-types';
import { getHashFromPublicKey } from '../../restore-flow/utils';
import { CoSigner } from '../AddCoSigners';
import { QuorumRadioOption } from '../Quorum';

export const FILENAME = 'shared-wallet-config.json';

const getScriptsFromCosigners = async (coSigners: CoSigner[]) =>
  await Promise.all(
    coSigners.map(async (coSigner) => {
      const publicKeyHex = Wallet.Cardano.Cip1854ExtendedAccountPublicKey.toBip32PublicKeyHex(
        Wallet.Cardano.Cip1854ExtendedAccountPublicKey(coSigner.sharedWalletKey),
      );
      return {
        pubkey: await getHashFromPublicKey(publicKeyHex, paymentScriptKeyPath),
        tag: 'pubkey',
      };
    }),
  );

// Function to map CreationFlowState to the schema JSON structure
const mapStateToSchema = async (state: CreationFlowState): Promise<SharedWalletSchema> => {
  const { walletName, coSigners, quorumRules } = state;

  if (!quorumRules) {
    throw new Error('Quorum rules are not defined');
  }

  // Construct NativeScript based on quorum rules
  let nativeScript: NativeScript;

  switch (quorumRules.option) {
    case QuorumRadioOption.AllAddresses: {
      nativeScript = {
        scripts: (await getScriptsFromCosigners(coSigners)) as ScriptPubkey[],
        tag: 'all',
      };

      break;
    }
    case QuorumRadioOption.Any: {
      nativeScript = {
        scripts: (await getScriptsFromCosigners(coSigners)) as ScriptPubkey[],
        tag: 'any',
      };
      break;
    }
    case QuorumRadioOption.NOfK: {
      nativeScript = {
        n: quorumRules.numberOfCosigner,
        scripts: (await getScriptsFromCosigners(coSigners)) as ScriptPubkey[],
        tag: 'n_of_k',
      };
      break;
    }
    default: {
      throw new Error('Invalid quorum option');
    }
  }

  return {
    metadata: {
      coSigners,
      sharedWalletName: walletName || '',
    },
    nativeScript,
  };
};

// Function to validate and download the wallet data as JSON
export const downloadWalletData = async (state: CreationFlowState): Promise<void> => {
  try {
    // Map the state to the schema structure
    const data = await mapStateToSchema(state);

    // Create a JSON blob from the validated data
    const indentation = 2;
    const blob = new Blob([JSON.stringify(data, null, indentation)], { type: 'application/json' });

    // Create a link element to trigger the download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = FILENAME;

    // Append the link to the document, trigger the download, and then remove the link
    document.body.append(link);
    link.click();
    link.remove();

    logger.debug(`JSON file downloaded and saved as ${FILENAME}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to download JSON file.', error);
    }
  }
};
