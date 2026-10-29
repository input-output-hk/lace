import {
  applyInFlightUtxoAdjustments,
  CardanoPaymentAddress,
  isCardanoCustodyAccount,
  utxoKey,
} from '@lace-contract/cardano-context';
import {
  combineLatest,
  filter,
  firstValueFrom,
  map,
  timeout,
  TimeoutError,
} from 'rxjs';

import {
  CardanoCustodyInvalidOperationError,
  CardanoCustodyModuleNotLoadedError,
  CardanoCustodyNetworkNotReadyError,
} from './cardano-custody-errors';

import type { CardanoContextObservables } from '../create-tx-builder';
import type { Cardano, EraSummary } from '@cardano-sdk/core';
import type { Activity, activitiesSelectors } from '@lace-contract/activities';
import type {
  CardanoCustodyAccount,
  CardanoCustodyAccountState,
  CardanoCustodyBuildRequest,
  CardanoCustodyCreatorIndexProbeRequest,
  cardanoContextActions,
  cardanoCustodyActions,
  cardanoCustodySelectors,
} from '@lace-contract/cardano-context';
import type {
  ActionObservables,
  StateObservables,
} from '@lace-contract/module';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
  WalletId,
  walletsSelectors,
} from '@lace-contract/wallet-repo';
import type { HexBytes } from '@lace-lib/util';
import type { Observable } from 'rxjs';

/**
 * The Cardano actions of a wallet with the Cardano modules loaded, as
 * observables: `wallet.actionObservables.cardanoContext`. Each `<action>$`
 * emits every dispatch of that action, such as the outcome of a submission.
 */
export type CardanoContextActionObservables = ActionObservables<
  typeof cardanoContextActions
>['cardanoContext'];

/**
 * The custody account actions of a wallet with `m.blockchainCardanoCustody`
 * loaded, as observables: `wallet.actionObservables.cardanoCustody`. Each
 * `<action>$` emits every dispatch of that action, such as the outcome of a
 * custody build.
 */
export type CardanoCustodyActionObservables = ActionObservables<
  typeof cardanoCustodyActions
>['cardanoCustody'];

/**
 * The custody account selectors of a wallet with `m.blockchainCardanoCustody`
 * loaded, as observables: `wallet.stateObservables.cardanoCustody`.
 */
export type CardanoCustodyObservables = StateObservables<
  typeof cardanoCustodySelectors
>['cardanoCustody'];

/**
 * The wallet's wallets and accounts as observables:
 * `wallet.stateObservables.wallets`. Custody helpers read the custody
 * accounts the wallet holds from it.
 */
export type WalletsObservables = StateObservables<
  typeof walletsSelectors
>['wallets'];

/**
 * The wallet's activities as observables: `wallet.stateObservables.activities`.
 * Custody helpers read the transactions in flight from it.
 */
export type ActivitiesObservables = StateObservables<
  typeof activitiesSelectors
>['activities'];

/**
 * The actions custody helpers dispatch on a wallet: custody builds and
 * creator-index probes, transaction submission, the activities a submission
 * records, and the wallet entities of custody accounts. A `LaceWallet`'s
 * `dispatch` with the Cardano modules loaded satisfies it.
 */
export type CardanoCustodyDispatch = {
  (
    key: 'cardanoCustody.buildCustodyTransaction',
    request: CardanoCustodyBuildRequest,
  ): void;
  (
    key: 'cardanoCustody.probeCustodyCreatorIndex',
    request: CardanoCustodyCreatorIndexProbeRequest,
  ): void;
  (key: 'cardanoContext.submitTx', props: { serializedTx: HexBytes }): void;
  (
    key: 'activities.upsertActivities',
    props: { accountId: AccountId; activities: Activity[] },
  ): void;
  (key: 'wallets.addWallet', wallet: AnyWallet): void;
  (
    key: 'wallets.updateWallet',
    props: { id: WalletId; changes: Partial<AnyWallet> },
  ): void;
  (
    key: 'wallets.updateAccount',
    walletId: WalletId,
    accountId: AccountId,
    changes: Partial<Readonly<AnyAccount>>,
  ): void;
};

/**
 * Structural requirement: the wallet must have been created with the Cardano
 * modules loaded (`blockchainCardano` and a Cardano provider), which sync and
 * submit custody transactions, and `blockchainCardanoCustody`, which builds
 * them.
 */
export type WalletWithCardanoCustody = {
  stateObservables: {
    cardanoContext: Pick<
      CardanoContextObservables,
      | 'selectAccountUtxos$'
      | 'selectChainId$'
      | 'selectEraSummaries$'
      | 'selectTip$'
      | 'selectTransactionHistoryGroupedByAccount$'
    >;
    cardanoCustody: Pick<
      CardanoCustodyObservables,
      | 'selectCardanoCustodyAccountState$'
      | 'selectCardanoCustodyGrantStatuses$'
      | 'selectSettledCardanoCustodyAccountState$'
    >;
    wallets: Pick<WalletsObservables, 'selectAll$'>;
    activities: Pick<
      ActivitiesObservables,
      'selectPendingActivitiesByAccount$'
    >;
  };
  actionObservables: {
    cardanoContext: Pick<
      CardanoContextActionObservables,
      'submitTxCompleted$' | 'submitTxFailed$'
    >;
    cardanoCustody: Pick<
      CardanoCustodyActionObservables,
      | 'buildCustodyTransactionCompleted$'
      | 'buildCustodyTransactionFailed$'
      | 'probeCustodyCreatorIndexCompleted$'
      | 'probeCustodyCreatorIndexFailed$'
    >;
  };
  dispatch: CardanoCustodyDispatch;
};

/**
 * The wallet's custody selectors, as observables.
 *
 * @throws {@link CardanoCustodyModuleNotLoadedError} When the wallet was
 * created without `m.blockchainCardanoCustody`, whatever its type says.
 */
export const custodyStateObservables = (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
): WalletWithCardanoCustody['stateObservables']['cardanoCustody'] => {
  const { cardanoCustody } = wallet.stateObservables as Partial<
    WalletWithCardanoCustody['stateObservables']
  >;
  if (!cardanoCustody) throw new CardanoCustodyModuleNotLoadedError();
  return cardanoCustody;
};

/**
 * The wallet's custody actions, as observables.
 *
 * @throws {@link CardanoCustodyModuleNotLoadedError} When the wallet was
 * created without `m.blockchainCardanoCustody`, whatever its type says.
 */
export const custodyActionObservables = (
  wallet: Pick<WalletWithCardanoCustody, 'actionObservables'>,
): WalletWithCardanoCustody['actionObservables']['cardanoCustody'] => {
  const { cardanoCustody } = wallet.actionObservables as Partial<
    WalletWithCardanoCustody['actionObservables']
  >;
  if (!cardanoCustody) throw new CardanoCustodyModuleNotLoadedError();
  return cardanoCustody;
};

/**
 * How long a custody helper waits for a new wallet's Cardano network: its
 * selection, which needs no provider request, and the era summaries the
 * Cardano provider then loads for it.
 */
const CARDANO_NETWORK_READY_TIMEOUT_MS = 30_000;

/** The first value of `ready$`, or the readiness error once the wait runs out. */
const firstOnceNetworkReady = async <T>(
  ready$: Observable<T>,
  missingOnTimeout: () => Promise<
    CardanoCustodyNetworkNotReadyError['missing']
  >,
): Promise<T> => {
  try {
    return await firstValueFrom(
      ready$.pipe(timeout({ first: CARDANO_NETWORK_READY_TIMEOUT_MS })),
    );
  } catch (error) {
    if (!(error instanceof TimeoutError)) throw error;
    throw new CardanoCustodyNetworkNotReadyError(
      CARDANO_NETWORK_READY_TIMEOUT_MS,
      await missingOnTimeout(),
    );
  }
};

/**
 * The wallet's active Cardano chain. A wallet selects its network shortly
 * after `createLaceWallet` returns, so this waits for it, up to 30 seconds:
 * custody helpers are safe to call right after wallet creation.
 *
 * @throws {@link CardanoCustodyNetworkNotReadyError} With `network` when no
 *   network is selected in time.
 */
export const readCardanoChainId = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
): Promise<Cardano.ChainId> =>
  firstOnceNetworkReady(
    wallet.stateObservables.cardanoContext.selectChainId$.pipe(
      filter((chainId): chainId is Cardano.ChainId => !!chainId),
    ),
    async () => 'network',
  );

/**
 * The wallet's active Cardano chain with its era summaries, which every
 * custody build reads. The provider loads them only after the wallet selects
 * its network, so this waits for both, up to 30 seconds in all: building
 * helpers are safe to call right after wallet creation. Once they are in the
 * wallet state, a build dispatched for this chain finds them.
 *
 * @throws {@link CardanoCustodyNetworkNotReadyError} With `network` when no
 *   network is selected in time, or `era-summaries` when the provider has
 *   not loaded them in time.
 */
export const readCardanoBuildChain = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
): Promise<{ chainId: Cardano.ChainId; eraSummaries: EraSummary[] }> => {
  const { selectChainId$, selectEraSummaries$ } =
    wallet.stateObservables.cardanoContext;
  return firstOnceNetworkReady(
    combineLatest([selectChainId$, selectEraSummaries$]).pipe(
      filter(
        (pair): pair is [Cardano.ChainId, EraSummary[]] =>
          !!pair[0] && !!pair[1]?.length,
      ),
      map(([chainId, eraSummaries]) => ({ chainId, eraSummaries })),
    ),
    async () =>
      (await firstValueFrom(selectChainId$)) ? 'era-summaries' : 'network',
  );
};

/**
 * The custody account `accountId` names in the wallet.
 *
 * @throws {@link CardanoCustodyInvalidOperationError} With `unknown-account` when
 *   the wallet holds no such custody account.
 */
export const readCardanoCustodyAccount = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  accountId: AccountId,
): Promise<CardanoCustodyAccount> => {
  const wallets = await firstValueFrom(
    wallet.stateObservables.wallets.selectAll$,
  );
  const account = wallets
    .flatMap(entity => entity.accounts as AnyAccount[])
    .filter(isCardanoCustodyAccount)
    .find(candidate => candidate.accountId === accountId);
  if (!account) {
    throw new CardanoCustodyInvalidOperationError('unknown-account', {
      accountId,
    });
  }
  return account;
};

/** The account's classification over the in-flight view, if anything is known of it. */
export const readCardanoCustodyAccountState = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  accountId: AccountId,
): Promise<CardanoCustodyAccountState | undefined> =>
  (
    await firstValueFrom(
      custodyStateObservables(wallet).selectCardanoCustodyAccountState$,
    )
  )(accountId);

/** The account's confirmed UTxOs, without in-flight adjustments. */
export const readSettledUtxos = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  accountId: AccountId,
): Promise<Cardano.Utxo[]> =>
  (
    await firstValueFrom(
      wallet.stateObservables.cardanoContext.selectAccountUtxos$,
    )
  )[accountId] ?? [];

/**
 * The outpoints, as `txId#index`, of the account's confirmed UTxOs that a
 * transaction this wallet submitted spends and that have not settled.
 */
export const readSpentInFlight = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  account: CardanoCustodyAccount,
): Promise<ReadonlySet<string>> => {
  const settled = await readSettledUtxos(wallet, account.accountId);
  const pending =
    (
      await firstValueFrom(
        wallet.stateObservables.activities.selectPendingActivitiesByAccount$,
      )
    )[account.accountId] ?? [];
  const unspent = new Set(
    applyInFlightUtxoAdjustments(
      settled,
      [CardanoPaymentAddress(account.blockchainSpecific.address)],
      pending,
    ).map(utxoKey),
  );
  return new Set(
    settled.map(utxoKey).filter(outpoint => !unspent.has(outpoint)),
  );
};

/**
 * The account's classification over its confirmed UTxOs only, as a site
 * that reads the chain sees it: a transaction in flight changes nothing
 * here. Undefined while its identity is invalid, its confirmed UTxOs are
 * unknown or its network's protocol parameters are unknown.
 */
export const readConfirmedCardanoCustodyAccountState = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  account: CardanoCustodyAccount,
): Promise<CardanoCustodyAccountState | undefined> =>
  (
    await firstValueFrom(
      custodyStateObservables(wallet).selectSettledCardanoCustodyAccountState$,
    )
  )(account.accountId);
