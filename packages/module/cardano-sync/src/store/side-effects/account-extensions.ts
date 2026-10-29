// How the custody account feature hooks into Cardano sync: a custody account
// discovers its one contract address and fetches its UTxOs by that address,
// and its pending operations expire. The stable SDK build resolves
// account-extensions.stable.ts instead, which hooks none of it.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
import { isCardanoCustodyAccount } from '@lace-contract/cardano-context';

import {
  fetchCustodyAccountUtxos,
  handleCustodyAccount,
} from './custody-accounts';
import { expireCustodyPendingActivities } from './expire-custody-pending-activities';

import type { SideEffect } from '../../module';

/** Whether the account is of a kind a feature adds: a custody account. */
export const isExtensionAccount = isCardanoCustodyAccount;

/** Address discovery for an account of a kind a feature adds. */
export const extensionAccountAddressDiscovery = handleCustodyAccount;

/** The UTxO fetch of an account of a kind a feature adds. */
export const extensionAccountUtxos = fetchCustodyAccountUtxos;

/** The sync side effects the features add. */
export const extensionSyncSideEffects: SideEffect[] = [
  expireCustodyPendingActivities,
];
