import { CoSigner } from 'add-shared-wallet/creation-flow/AddCoSigners';
import { FileErrorMessage, FileValidationError } from './types';

const sharedKeys = 'addr_shared_vksdhgfsft578s6tf68tdsf,stake_shared_vkgyufieus65cuv76s5vrs7';

export const validateJson = (file: File): Promise<{ error?: FileValidationError; isFileValid: boolean }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const isFileRecognized = 'cosigners' in json;

        if (!isFileRecognized) {
          reject({ message: FileErrorMessage.UNRECOGNIZED });
        }

        // change json file in this directory to test happy path or mismatch error modal
        const isAddrMatch = json.cosigners.findIndex((item: CoSigner) => item.keys === sharedKeys);

        if (isAddrMatch === -1) {
          reject({ message: FileErrorMessage.INVALID_KEYS });
        }

        resolve({ isFileValid: true });
      } catch (error) {
        reject(error);
      }
    });

    reader.readAsText(file);
  });
