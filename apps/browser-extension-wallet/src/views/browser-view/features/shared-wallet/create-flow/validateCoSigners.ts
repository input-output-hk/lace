import { CoSigner, CoSignerError, maxCoSignerNameLength } from '@lace/core';

const keysRegex = /(?<payment>addr_shared_vk[\da-z]*),(?<stake>stake_shared_vk[\da-z]*)?/;
export const validateCoSigners = (coSigners: CoSigner[]): CoSignerError[] => {
  let coSignersErrors: CoSignerError[] = [];

  coSigners.forEach(({ id, keys, name }) => {
    let keysError: CoSignerError['keys'];
    let nameError: CoSignerError['name'];

    const keysValidationResult = keysRegex.exec(keys);
    if (!keys) keysError = 'required';
    else if (!keysValidationResult) keysError = 'invalid';

    if (!name) nameError = 'required';
    else if (name.length > maxCoSignerNameLength) nameError = 'tooLong';
    else if (coSigners.some((coSigner) => coSigner.id !== id && coSigner.name === name)) nameError = 'duplicated';

    if (keysError || nameError) {
      coSignersErrors = [...coSignersErrors, { id, keys: keysError, name: nameError }];
    }
  });

  return coSignersErrors;
};
