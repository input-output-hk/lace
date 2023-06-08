/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import Dexie from 'dexie';

const isAddressError = /address/i;
const isNameError = /name/i;
const constraintError = 'ConstraintError';

export const addressErrorMessage = 'addressBook.errors.givenAddressAlreadyExist';
export const nameErrorMessage = 'addressBook.errors.givenNameAlreadyExist';

export const getErrorMessage = (error: Error): string => {
  const updateOrSaveError = error.name === constraintError || error instanceof Dexie.ModifyError;

  if (isAddressError.test(error.message) && updateOrSaveError) return addressErrorMessage;
  if (isNameError.test(error.message) && updateOrSaveError) return nameErrorMessage;

  return 'general.errors.somethingWentWrong';
};

const numericRegExp = /^\d+$/;
const alphanumericRegExp = /^(?=.*[A-Za-z])(?=.*\d)/;
const startsWithNumberRegExp = /^\d/;
const startsWithUppercaseRegExp = /^[A-Z]/;
const startsWithLowercaseRegExp = /^[a-z]/;

const caseInsensitiveSortByCb = ({ name: nameA }: { name: string }, { name: nameB }: { name: string }) =>
  nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });

export const sortTabletByName = (item: any[]) => {
  const numerical = [];
  const alphanumericStartsWithNumber = [];
  const uppercase = [];
  const alphanumericStartsWithUppercase = [];
  const lowercase = [];
  const alphanumericStartsWithLowerCase = [];
  const alphabetical = [];

  for (const value of item) {
    const name = value.name.split('').join('');
    // Number
    if (numericRegExp.test(name)) numerical.push(value);
    // Alphanumeric that starts with a number
    else if (alphanumericRegExp.test(name) && startsWithNumberRegExp.test(name))
      alphanumericStartsWithNumber.push(value);
    // Alphanumeric that starts with uppercase
    else if (alphanumericRegExp.test(name) && startsWithUppercaseRegExp.test(name))
      alphanumericStartsWithUppercase.push(value);
    // Alphanumeric that starts with lowercase
    else if (alphanumericRegExp.test(name) && startsWithLowercaseRegExp.test(name))
      alphanumericStartsWithLowerCase.push(value);
    // Uppercase
    else if (name.toString().toUpperCase() === name.toString()) uppercase.push(value);
    // Lowercase
    else if (name.toString().toLowerCase() === name.toString()) lowercase.push(value);
    // alphabetical
    else alphabetical.push(value);
  }

  return [
    ...numerical.sort(caseInsensitiveSortByCb),
    ...alphanumericStartsWithNumber.sort(caseInsensitiveSortByCb),
    ...uppercase.sort(caseInsensitiveSortByCb),
    ...alphanumericStartsWithUppercase.sort(caseInsensitiveSortByCb),
    ...lowercase.sort(caseInsensitiveSortByCb),
    ...alphanumericStartsWithLowerCase.sort(caseInsensitiveSortByCb),
    ...alphabetical.sort(caseInsensitiveSortByCb)
  ];
};
