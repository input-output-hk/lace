import { Cardano } from '@cardano-sdk/core';
import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  deriveCustodyAccountIdentity,
} from '@lace-lib/cardano-custody';

import type { Address, AnyAddress } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';

const identity = deriveCustodyAccountIdentity({
  contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
  creatorKeyHash: 'c1'.repeat(28),
  chainId: Cardano.ChainIds.Preprod,
});
if (!identity.ok) throw new Error('fixture identity');

/** The address entry address discovery emits for a Cardano custody account. */
export const custodyAddressEntry = (accountId: AccountId): AnyAddress => ({
  accountId,
  address: identity.value.address as unknown as Address,
  blockchainName: 'Cardano',
});
