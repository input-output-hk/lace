import type { Tagged } from 'type-fest';

/** Opaque type for address aliases (ada handles, ENS names, etc.) */
export type AddressAlias = Tagged<string, 'AddressAlias'>;
export const AddressAlias = (value: string): AddressAlias =>
  value as AddressAlias;
