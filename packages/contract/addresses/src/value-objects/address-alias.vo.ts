import type { Tagged } from 'type-fest';

/** Opaque type for address aliases (ada handles, ENS names, etc.) */
export type AddressAlias = Tagged<string, 'AddressAlias'>;
/** Types a string as an address alias. It checks nothing. */
export const AddressAlias = (value: string): AddressAlias =>
  value as AddressAlias;
