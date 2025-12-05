import { Wallet } from '@lace/cardano';
import { CoSigner, CoSignerError, CoSignerErrorKeys, CoSignerErrorName, maxCoSignerNameLength } from './AddCoSigners';

export const validateCoSigners = (coSigners: CoSigner[]): CoSignerError[] => {
  let coSignersErrors: CoSignerError[] = [];

  coSigners.forEach(({ id, sharedWalletKey, name }) => {
    let keyError: CoSignerErrorKeys | undefined;
    let nameError: CoSignerErrorName | undefined;

    if (!sharedWalletKey) keyError = CoSignerErrorKeys.Required;
    else {
      try {
        Wallet.Cardano.Cip1854ExtendedAccountPublicKey(sharedWalletKey);
        if (coSigners.some((coSigner) => coSigner.id !== id && coSigner.sharedWalletKey === sharedWalletKey)) {
          keyError = CoSignerErrorKeys.Duplicated;
        }
      } catch {
        keyError = CoSignerErrorKeys.Invalid;
      }
    }

    if (!name) nameError = CoSignerErrorName.Required;
    else if (name.length > maxCoSignerNameLength) nameError = CoSignerErrorName.TooLong;
    else if (coSigners.some((coSigner) => coSigner.id !== id && coSigner.name === name)) {
      nameError = CoSignerErrorName.Duplicated;
    }

    if (keyError || nameError) {
      coSignersErrors = [...coSignersErrors, { id, name: nameError, sharedWalletKey: keyError }];
    }
  });

  return coSignersErrors;
};
