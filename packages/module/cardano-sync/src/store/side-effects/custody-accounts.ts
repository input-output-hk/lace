import { AddressType } from '@cardano-sdk/key-management';
import {
  CardanoPaymentAddress,
  toContractAddress,
  verifyCardanoCustodyAccountIdentity,
} from '@lace-contract/cardano-context';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import { map, of, throwError } from 'rxjs';

import { chainAccountStateOperations } from './chain-account-state-operations';
import { throwOnError } from './throw-on-error';

import type {
  ActionCreators,
  CardanoSyncAction,
  SideEffect,
} from '../../module';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  CardanoCustodyAccount,
  CardanoCustodyAccountIdentityError,
} from '@lace-contract/cardano-context';
import type { TranslationKey } from '@lace-contract/i18n';
import type { SyncOperationId } from '@lace-contract/sync';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

type Logger = Parameters<SideEffect>[2]['logger'];
type CardanoProvider = Parameters<SideEffect>[2]['cardanoProvider'];

/**
 * Discovers the one address of a Cardano custody account: its base address,
 * re-derived from the stored identity. The sync fails when the stored
 * address, reward account or stake script hash differs from the derived one,
 * so funds are never shown at an address the custody contract does not
 * govern for this account.
 *
 * The entry carries the `type`, `index` and `accountIndex` every address
 * entry needs, but no key derives it. It must never reach a signer as a
 * known address: a key agent would sign every custody input with the key at
 * that path. No signer factory accepts a custody account, so signing never
 * reads its addresses.
 */
export const handleCustodyAccount = (params: {
  account: CardanoCustodyAccount;
  accountId: AccountId;
  operationId: SyncOperationId;
  actions: ActionCreators;
  logger: Parameters<SideEffect>[2]['logger'];
}): Observable<CardanoSyncAction> => {
  const { account, accountId, operationId, actions, logger } = params;
  const { chainId } = account.blockchainSpecific;

  const identity = verifyCardanoCustodyAccountIdentity(
    account.blockchainSpecific,
  );
  if (!identity.ok) {
    logger.error(
      `Address discovery refused custody account ${accountId}: ${identity.error.code}`,
      identity.error,
    );
    return of(
      actions.sync.failSyncOperation({
        accountId,
        operationId,
        error: 'sync.error.address-discovery-failed' as TranslationKey,
      }),
    );
  }

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
      accountId,
      addresses: [
        toContractAddress(
          {
            accountIndex: 0,
            address: identity.value.address,
            index: 0,
            networkId: chainId.networkId,
            rewardAccount: identity.value.rewardAccount,
            type: AddressType.External,
          },
          chainId.networkMagic,
        ),
      ],
    }),
    ...chainAccountStateOperations({
      accountId,
      discoveryOperationId: operationId,
      actions,
    }),
    actions.sync.completeSyncOperation({
      accountId,
      operationId,
    }),
  );
};

/** The address entry discovery stored is not the account's derived address. */
interface CardanoCustodyAddressEntryMismatch {
  readonly code: 'address-entry-mismatch';
  readonly entry: string;
  readonly derived: Cardano.PaymentAddress;
}

/**
 * A custody account's UTxOs are not fetched: the account no longer matches
 * the identity its contract derives.
 */
class CardanoCustodyUtxoSyncRefusedError extends Error {
  public constructor(
    readonly accountId: AccountId,
    readonly reason:
      | CardanoCustodyAccountIdentityError
      | CardanoCustodyAddressEntryMismatch,
  ) {
    super(
      `Refused the UTxO sync of custody account ${accountId}: ${reason.code}`,
    );
    this.name = 'CardanoCustodyUtxoSyncRefusedError';
  }
}

/**
 * A custody account's UTxOs: exactly those whose full address is the
 * account's base address, the only outputs the custody contract lets the
 * account spend.
 *
 * Discovery verifies the identity only once, when it stores the address
 * entry, so every fetch verifies it again: an identity changed since then,
 * or an entry that no longer matches it, fails the fetch.
 *
 * Fetched by address rather than by stake key. The stake credential also
 * gathers outputs under any other payment credential, which anyone can
 * create at no cost to inflate the fetch, and none of which belong to the
 * account. The key-hash franken filter does not apply: every custody output
 * has the script's payment credential.
 *
 * Reference scripts are read too: classification counts a reserve that
 * carries one as foreign.
 */
export const fetchCustodyAccountUtxos = (params: {
  account: CardanoCustodyAccount;
  accountAddresses: AnyAddress<CardanoAddressData>[];
  getUtxosAtAddress: CardanoProvider['getUtxosAtAddress'];
  logger: Logger;
}): Observable<Cardano.Utxo[]> => {
  const { accountId, blockchainSpecific } = params.account;
  const identity = verifyCardanoCustodyAccountIdentity(blockchainSpecific);
  if (!identity.ok) {
    return throwError(
      () => new CardanoCustodyUtxoSyncRefusedError(accountId, identity.error),
    );
  }
  const { address } = identity.value;
  const strayEntry = params.accountAddresses.find(
    entry => entry.address !== CardanoPaymentAddress(address),
  );
  if (strayEntry) {
    return throwError(
      () =>
        new CardanoCustodyUtxoSyncRefusedError(accountId, {
          code: 'address-entry-mismatch',
          entry: strayEntry.address,
          derived: address,
        }),
    );
  }
  return params
    .getUtxosAtAddress(
      { address: CardanoPaymentAddress(address), withReferenceScripts: true },
      { chainId: blockchainSpecific.chainId },
    )
    .pipe(
      map(throwOnError),
      retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
      map(utxos => {
        const own = utxos.filter(([, output]) => output.address === address);
        if (own.length < utxos.length) {
          params.logger.warn(
            `Dropped ${
              utxos.length - own.length
            } UTxOs not at the address of custody account ${accountId}`,
          );
        }
        return own;
      }),
    );
};
