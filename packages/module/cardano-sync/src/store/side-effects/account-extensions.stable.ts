// The stable SDK build resolves this file in place of account-extensions.ts:
// the stable SDK holds no account kind the canary features add, so every
// account syncs as a key or multi-signature account and no side effect is
// added.
import { EMPTY } from 'rxjs';

import type { CardanoSyncAction, SideEffect } from '../../module';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/** Whether the account is of a kind a feature adds: never. */
export const isExtensionAccount = (_account: AnyAccount): _account is never =>
  false;

/** Address discovery for an account of a kind a feature adds: none exists. */
export const extensionAccountAddressDiscovery = (
  _params: Record<string, unknown> & { account: never },
): Observable<CardanoSyncAction> => EMPTY;

/** The UTxO fetch of an account of a kind a feature adds: none exists. */
export const extensionAccountUtxos = (
  _params: Record<string, unknown> & { account: never },
): Observable<Cardano.Utxo[]> => EMPTY;

/** The sync side effects the features add: none. */
export const extensionSyncSideEffects: SideEffect[] = [];
