import type { AddressAlias } from '@lace-contract/addresses';
import type { Tagged } from 'type-fest';

const PREFIX = '$';
const MIN_LENGTH = 2;

/** ADA Handle address alias (e.g., "$myhandle") */
export type Handle = Tagged<AddressAlias, 'Handle'>;
export const Handle = (value: string): Handle => {
  if (!Handle.isHandle(value))
    throw new Error('Invalid handle format: expected $handle, got ' + value);
  return value;
};

/** Type guard for ADA Handle format */
Handle.isHandle = (input: string): input is Handle =>
  input.charAt(0) === PREFIX && input.length > MIN_LENGTH;
