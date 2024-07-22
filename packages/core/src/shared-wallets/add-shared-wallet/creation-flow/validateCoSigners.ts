import { CoSigner, CoSignerError, CoSignerErrorKeys, CoSignerErrorName, maxCoSignerNameLength } from './AddCoSigners';

const keyRegex = /^[\dA-Fa-f]{128}$/;
export const validateCoSigners = (coSigners: CoSigner[]): CoSignerError[] => {
  let coSignersErrors: CoSignerError[] = [];

  coSigners.forEach(({ id, sharedWalletKey, name }) => {
    let keyError: CoSignerErrorKeys | undefined;
    let nameError: CoSignerErrorName | undefined;

    const keyValidationResult = keyRegex.exec(sharedWalletKey);
    if (!sharedWalletKey) keyError = CoSignerErrorKeys.Required;
    else if (!keyValidationResult) keyError = CoSignerErrorKeys.Invalid;
    else if (coSigners.some((coSigner) => coSigner.id !== id && coSigner.sharedWalletKey === sharedWalletKey)) {
      keyError = CoSignerErrorKeys.Duplicated;
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
