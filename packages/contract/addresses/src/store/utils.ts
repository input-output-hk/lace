import type { AnyAddress } from '../types';
import type { BlockchainName } from '@lace-lib/util-store';

export const filterAddressesByBlockchainName = (
  addresses: AnyAddress[],
  blockchainName: BlockchainName,
) => addresses.filter(a => a.blockchainName === blockchainName);
