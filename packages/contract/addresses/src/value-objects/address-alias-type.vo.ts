import type { Tagged } from 'type-fest';

/** Address alias provider name (e.g. 'ADA_HANDLE') */
export type AddressAliasType = Tagged<string, 'AddressAliasType'>;
/** Types a string as an address alias provider's name. It checks nothing. */
export const AddressAliasType = (value: string): AddressAliasType =>
  value as AddressAliasType;
