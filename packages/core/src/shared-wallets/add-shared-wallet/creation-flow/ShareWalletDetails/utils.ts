import type { StateShareDetails } from '../../creation-flow/state-and-types';
import { QuorumRadioOption } from '../Quorum';

export const FILENAME = 'shared-wallet-config.json';

interface SharedWalletSchema {
  coSigners: Array<{
    id: string;
    keys: string;
    name: string;
  }>;
  creationStep: string;
  quorum: {
    type: string;
    value: number;
  };
  walletName: string;
}

// Function to map StateShareDetails to the schema JSON structure
const mapStateToSchema = (state: StateShareDetails): SharedWalletSchema => {
  const { walletName, coSigners, quorumRules, step } = state;
  return {
    coSigners: coSigners.map((c) => ({
      id: c.id,
      keys: c.keys,
      name: c.name,
    })),
    creationStep: step,
    quorum: {
      type: quorumRules.option,
      value: quorumRules.option === QuorumRadioOption.AllAddresses ? coSigners.length : quorumRules.numberOfCosigner,
    },
    walletName: walletName || '',
  };
};

// Function to validate and download the wallet data as JSON
export const downloadWalletData = (state: StateShareDetails): void => {
  try {
    // Map the state to the schema structure
    const data = mapStateToSchema(state);

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

    console.info(`JSON file downloaded and saved as ${FILENAME}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to download JSON file: ${error.message}`);
    }
  }
};
