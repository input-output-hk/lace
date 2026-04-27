import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { Err } from '@lace-sdk/util';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  concat,
  filter,
  map,
  mergeMap,
  of,
  take,
  toArray,
} from 'rxjs';

import { CardanoPaymentAddress } from '../../types';
import { isCardanoAccount } from '../../util';
import { getScriptAddress } from '../get-script-address';

import { isAddressDiscoveryOperation } from './sync-operation-utils';

import type { Action, ActionCreators, SideEffect } from '../../contract';
import type { CardanoMultiSigAccountProps } from '../../types';
import type { TranslationKey } from '@lace-contract/i18n';
import type {
  AccountId,
  MultiSigWalletAccount,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/**
 * Handles MultiSig account address discovery by generating script address.
 */
const handleMultiSigAccount = (params: {
  account: MultiSigWalletAccount<CardanoMultiSigAccountProps>;
  accountId: AccountId;
  operationId: string;
  actions: ActionCreators;
}): Observable<Action> => {
  const { account, accountId, operationId, actions } = params;

  const groupedAddress = getScriptAddress(
    account.blockchainSpecific.paymentScript,
    account.blockchainSpecific.stakingScript,
    account.blockchainSpecific.chainId.networkMagic,
  );

  return of(
    actions.sync.updateSyncOperation({
      accountId,
      operationId,
      update: {
        status: 'InProgress',
        type: 'Indeterminate',
      },
    }),
    actions.addresses.upsertAddresses({
      blockchainName: 'Cardano',
      addresses: [
        {
          ...groupedAddress,
          address: CardanoPaymentAddress(groupedAddress.address),
        },
      ],
      accountId,
    }),
    actions.sync.completeSyncOperation({
      accountId,
      operationId,
    }),
  );
};

/**
 * Responds to address discovery sync operations.
 *
 * This side effect:
 * - Watches for pending address-discovery operations
 * - Marks operation as InProgress/Indeterminate
 * - Discovers addresses for the account
 * - Marks operation as completed or failed
 */
export const addressDiscoverySync: SideEffect = (
  { sync: { addSyncOperation$ } },
  { wallets: { selectActiveNetworkAccounts$ } },
  { actions, cardanoProvider: { discoverAddresses } },
) =>
  addSyncOperation$.pipe(
    filter(
      action =>
        action.payload.operation.status === 'Pending' &&
        isAddressDiscoveryOperation(action.payload.operation.operationId),
    ),
    mergeMap(action => {
      const { accountId, operation } = action.payload;
      const operationId = operation.operationId;

      return selectActiveNetworkAccounts$.pipe(
        take(1), // Take current value only, prevent re-subscription on state changes
        map(accounts =>
          accounts
            .filter(isCardanoAccount)
            .find(account => account.accountId === accountId),
        ),
        filter((account): account is NonNullable<typeof account> => !!account),
        mergeMap((account): Observable<Action> => {
          // Handle MultiSig accounts
          if (account.accountType === 'MultiSig') {
            return handleMultiSigAccount({
              account,
              accountId,
              operationId,
              actions,
            });
          }

          // Mark operation as InProgress for regular accounts
          const markInProgress = actions.sync.updateSyncOperation({
            accountId,
            operationId,
            update: {
              status: 'InProgress',
              type: 'Indeterminate',
            },
          });

          // Regular account discovery
          return concat(
            of(markInProgress),
            discoverAddresses(
              {
                accountIndex: account.blockchainSpecific.accountIndex,
                xpub: account.blockchainSpecific.extendedAccountPublicKey,
              },
              { chainId: account.blockchainSpecific.chainId },
            ).pipe(
              // Convert Err results to thrown errors for retryBackoff
              map(result => {
                if (result.isErr()) {
                  throw result.error;
                }
                return result;
              }),
              retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
              // After retries exhausted, convert thrown error back to Err result
              catchError(error => of(Err(error))),
              // createTrackAccountTransactionHistory depends on discovery being completed at least once before it fetches
              // transactions - that is to avoid gaps in local tx history when we have partial addresses list.
              toArray(),
              mergeMap(discoverAddressesResults => {
                const anyFailure = discoverAddressesResults.find(
                  r => r.isErr() && r.error,
                );
                if (anyFailure) {
                  return [
                    actions.sync.failSyncOperation({
                      accountId,
                      operationId,
                      error:
                        'sync.error.address-discovery-failed' as TranslationKey,
                    }),
                  ];
                }
                const addresses = discoverAddressesResults.map(result =>
                  result.unwrap(),
                );
                return [
                  actions.addresses.upsertAddresses({
                    blockchainName: 'Cardano',
                    accountId: account.accountId,
                    addresses,
                  }),
                  actions.sync.completeSyncOperation({
                    accountId,
                    operationId,
                  }),
                ];
              }),
            ),
          );
        }),
      );
    }),
  );
