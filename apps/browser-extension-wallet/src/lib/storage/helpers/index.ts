/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { TranslationKey } from '@lib/translations/types';
import Dexie from 'dexie';

const isAddressError = /address/i;
const isNameError = /name/i;
const constraintError = 'ConstraintError';

export const addressErrorMessage = 'addressBook.errors.givenAddressAlreadyExist';
export const nameErrorMessage = 'addressBook.errors.givenNameAlreadyExist';

export const getErrorMessage = (error: Error): TranslationKey => {
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
