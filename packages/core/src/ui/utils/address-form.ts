import { KoraLabsHandleProvider } from '@cardano-sdk/cardano-services-client';
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResolveAddressValidatorFn = (_rule: Rule, value: string, handleResolver: any) => Promise<void>;

export type AddressValidators = {
  name: (value: string) => string;
  address: (address: string) => string;
  handle: (value: string) => Promise<string>;
};

export const getValidator =
  (validate: (val: string) => string): ValidatorFn =>
  (_rule: Rule, value: string) => {
    const res = validate(value);
    return !res ? Promise.resolve() : Promise.reject(res);
  };

export const getValidatorWithResolver = (
  validate: (val: string, handleResolver: KoraLabsHandleProvider) => Promise<string>
): ResolveAddressValidatorFn => {
  const debouncedValidate = debounce(validate, HANDLE_DEBOUNCE_TIME);

  return async (_rule: Rule, value: string, handleResolver: KoraLabsHandleProvider) => {
    const res = await debouncedValidate(value, handleResolver);
    return !res ? Promise.resolve() : Promise.reject(res);
  };
};
