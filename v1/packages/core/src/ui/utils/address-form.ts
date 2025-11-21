import debounce from 'debounce-promise';
import { HANDLE_DEBOUNCE_TIME } from './handle';
import { Rule } from 'antd/lib/form';

export type valuesPropType = {
  id?: number;
  name?: string;
  address?: string;
};

export const nameKey = 'name';
export const addressKey = 'address';
export const keys = [nameKey, addressKey];

export type ValidatorFn = (_rule: Rule, value: string) => Promise<void>;

export type AddressValidators = {
  name: (value: string) => string;
  address: (address: string) => string;
  handle: (value: string) => Promise<string>;
};

export const getValidator =
  (validate: AddressValidators['name']): ValidatorFn =>
  (_rule: Rule, value: string) => {
    const res = validate(value);
    return !res ? Promise.resolve() : Promise.reject(res);
  };

export const getValidatorWithResolver = (validate: AddressValidators['handle']): ValidatorFn => {
  const debouncedValidate = debounce(validate, HANDLE_DEBOUNCE_TIME);

  return async (_rule: Rule, value: string) => {
    const res = await debouncedValidate(value);
    return !res ? Promise.resolve() : Promise.reject(res);
  };
};
