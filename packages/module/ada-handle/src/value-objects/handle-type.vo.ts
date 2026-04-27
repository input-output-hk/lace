import type { AddressAliasType } from '@lace-contract/addresses';

/** ADA Handle address alias (e.g., "$myhandle") */
export type HandleType = AddressAliasType & 'ADA_HANDLE';
export const HandleType = (): HandleType => 'ADA_HANDLE' as HandleType;
