import { Timestamp } from '@lace-sdk/util';
import { filter, map, withLatestFrom } from 'rxjs';

import { isCardanoAccount } from '../../util';

import {
  CardanoSyncOperationType,
  createSyncOperationId,
} from './sync-operation-utils';

import type { SideEffect } from '../../contract';
import type { TranslationKey } from '@lace-contract/i18n';

/**
 * Converts a `cardanoContext.requestManualAddressDiscovery` action into a
 * Pending ADDRESS_DISCOVERY_THOROUGH sync operation. The existing
 * `addressDiscoverySync` side-effect picks it up, sets `thorough: true` on
 * the provider call, and runs the upper-bounded set-driven walk.
 *
 * Uses `withLatestFrom` (not `combineLatest`) so the operation fires only in
 * response to the user trigger, sampling the current tip + accounts at that
 * moment. No retry/backoff here — the downstream side-effect handles it.
 *
 * Bypasses `coordinateCardanoSync`'s `!hasAddresses` guard by enqueuing
 * directly. This is intentional: thorough discovery targets accounts that
 * already have addresses but may be missing some.
 */
export const manualAddressDiscoveryEnqueue: SideEffect = (
  { cardanoContext: { requestManualAddressDiscovery$ } },
  { cardanoContext: { selectTip$ }, wallets: { selectActiveNetworkAccounts$ } },
  { actions },
) =>
  requestManualAddressDiscovery$.pipe(
    withLatestFrom(selectActiveNetworkAccounts$, selectTip$),
    map(([action, accounts, tip]) => {
      const { accountId } = action.payload;
      const account = accounts.find(a => a.accountId === accountId);
      if (!account || !isCardanoAccount(account)) return null;
      const operationId = createSyncOperationId(
        accountId,
        tip?.hash,
        CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH,
      );
      return actions.sync.addSyncOperation({
        accountId,
        operation: {
          operationId,
          status: 'Pending',
          description: 'sync.operation.address-discovery' as TranslationKey,
          startedAt: Timestamp(Date.now()),
        },
      });
    }),
    filter(Boolean),
  );
