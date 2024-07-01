import { CoSigner, CoSignerError, CoSignerErrorKeys, CoSignerErrorName, maxCoSignerNameLength } from './AddCoSigners';

const keysRegex = /(?<payment>addr_shared_vk[\da-z]*),(?<stake>stake_shared_vk[\da-z]*)?/;
export const validateCoSigners = (coSigners: CoSigner[]): CoSignerError[] => {
  let coSignersErrors: CoSignerError[] = [];

  coSigners.forEach(({ id, keys, name }) => {
    let keysError: CoSignerErrorKeys | undefined;
    let nameError: CoSignerErrorName | undefined;

    const keysValidationResult = keysRegex.exec(keys);
    if (!keys) keysError = CoSignerErrorKeys.Required;
    else if (!keysValidationResult) keysError = CoSignerErrorKeys.Invalid;

    if (!name) nameError = CoSignerErrorName.Required;
    else if (name.length > maxCoSignerNameLength) nameError = CoSignerErrorName.TooLong;
    else if (coSigners.some((coSigner) => coSigner.id !== id && coSigner.name === name)) {
      nameError = CoSignerErrorName.Duplicated;
    }

    if (keysError || nameError) {
      coSignersErrors = [...coSignersErrors, { id, keys: keysError, name: nameError }];
    }
  });

  return coSignersErrors;
};
