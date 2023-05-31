/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import Dexie from 'dexie';

const isAddressError = /address/i;
const isNameError = /name/i;
const constraintError = 'ConstraintError';

const addressErrorMessage = 'addressBook.errors.givenAddressAlreadyExist';
const nameErrorMessage = 'addressBook.errors.givenNameAlreadyExist';

export const getErrorMessage = (error: Error): string => {
  const updateOrSaveError = error.name === constraintError || error instanceof Dexie.ModifyError;

  if (isAddressError.test(error.message) && updateOrSaveError) return addressErrorMessage;
  if (isNameError.test(error.message) && updateOrSaveError) return nameErrorMessage;

  return 'general.errors.somethingWentWrong';
};

export const sortTabletByName = (item: any[]) => {
  const idxLetterStarts = item.findIndex((value: any) => new RegExp(/^[A-Za-z]/).test(value.name));
  const alphabeticSide = item.slice(idxLetterStarts);
  const numericSide = item.slice(0, idxLetterStarts);

  return [...alphabeticSide, ...numericSide];
};
