import { UtxoCacheKey } from '@lace-contract/cardano-context';
import { Err, Ok } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  createSourceContext$,
  resolveResumeContext$,
} from '../../../src/store/side-effects/create-source-context';
import { buildCardanoAccount } from '../../support/cardano-account';

import type { SideEffect } from '../../../src';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const BASE_ADDRESS =
  'addr_test1qpktptaz7xlvv0ser3p0r5uwfdx243wccg5u35ar6ss8awv5rs0r8umwxy2zp4y0e0qmthzs2dmgtjt2ahrscq4pwz7q84j6l3';

const walletId = 'wallet-0' as never;
const accountId = 'account-0' as never;
const blockchainNetworkId = 'cardano-preprod' as never;
const chainId = { networkId: 0, networkMagic: 1 } as Cardano.ChainId;

const account = buildCardanoAccount({
  accountId,
  walletId,
  accountIndex: 0,
  chainId,
  extendedAccountPublicKey: 'xpub0' as never,
  blockchainNetworkId,
  networkType: 'testnet',
});
const wallet = { walletId, accounts: [account] } as unknown as AnyWallet;

const storeUtxo = [{ txId: 'store' }, {}] as unknown as Cardano.Utxo;

const addressRecord = {
  accountId,
  blockchainName: 'Cardano',
  address: BASE_ADDRESS,
  data: {
    accountIndex: 0,
    index: 0,
    networkId: 0,
    networkMagic: 1,
    rewardAccount:
      'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
    type: 0,
    stakeKeyDerivationPath: { role: 2, index: 0 },
  },
} as never;

type StateObservables = Parameters<SideEffect>[1];

const cacheKeyFor = (accountAddressCount: number) =>
  UtxoCacheKey({
    topOnChainActivityId: 'tx0',
    stakeKeys: [],
    accountAddressCount,
  });

const stateObservables = {
  wallets: { selectWalletById$: of(() => wallet) },
  addresses: { selectByAccountId$: of(() => [addressRecord]) },
  cardanoContext: {
    selectAvailableAccountUtxos$: of({ [accountId]: [storeUtxo] }),
    selectLastFetchedUtxoCacheKeyByAccount$: of({
      [accountId]: cacheKeyFor(1),
    }),
    selectAllNetworkInfo$: of({
      [blockchainNetworkId]: { protocolParameters: { maxTxSize: 16_384 } },
    }),
  },
} as unknown as StateObservables;

describe('createSourceContext$', () => {
  it('resolves the account-0 context from the synced store', async () => {
    const context = await firstValueFrom(
      createSourceContext$(
        { sourceWalletId: walletId, sourceAccountId: accountId },
        stateObservables,
      ),
    );

    expect(context.utxos).toEqual([storeUtxo]);
    expect(context.addresses.map(a => a.address)).toEqual([BASE_ADDRESS]);
    expect(context.signingAccounts).toEqual([
      { accountId, accountIndex: 0, extendedAccountPublicKey: 'xpub0' },
    ]);
  });

  // The regression this pins: a UTxO fetch racing address discovery keeps
  // only the UTxOs on the addresses known so far, so a source funded on a
  // late-discovered (e.g. change) address stores as empty and the planner
  // refuses a funded wallet. The context must reject any set whose fetch
  // was filtered against fewer addresses than are now known.
  it('rejects a UTxO set fetched under a narrower address set', async () => {
    const staleFetch = {
      ...stateObservables,
      cardanoContext: {
        ...(stateObservables as { cardanoContext: object }).cardanoContext,
        // Entry exists but was produced before discovery finished: the funded
        // change-address UTxO was dropped as franken, and the recorded
        // address count (0) trails the one address now in the store.
        selectAvailableAccountUtxos$: of({ [accountId]: [] }),
        selectLastFetchedUtxoCacheKeyByAccount$: of({
          [accountId]: cacheKeyFor(0),
        }),
      },
    } as unknown as StateObservables;

    // The stubbed stores complete after their single emission, so a held gate
    // surfaces as an empty sequence rather than a hang.
    await expect(
      firstValueFrom(
        createSourceContext$(
          { sourceWalletId: walletId, sourceAccountId: accountId },
          staleFetch,
        ),
      ),
    ).rejects.toThrow('no elements in sequence');
  });

  it('accepts the set once the refetch has covered the full address set', async () => {
    const catchesUp = {
      ...stateObservables,
      cardanoContext: {
        ...(stateObservables as { cardanoContext: object }).cardanoContext,
        selectAvailableAccountUtxos$: of(
          { [accountId]: [] },
          { [accountId]: [storeUtxo] },
        ),
        selectLastFetchedUtxoCacheKeyByAccount$: of(
          { [accountId]: cacheKeyFor(0) },
          { [accountId]: cacheKeyFor(1) },
        ),
      },
    } as unknown as StateObservables;

    const context = await firstValueFrom(
      createSourceContext$(
        { sourceWalletId: walletId, sourceAccountId: accountId },
        catchesUp,
      ),
    );
    expect(context.utxos).toEqual([storeUtxo]);
  });
});

// The resume resolver holds the funds-safety intersection: pinned plan inputs
// x live provider UTxOs, keyed by txId#index. run-sweep's own tests inject a
// hand-built result here, so this is where the computation itself is pinned.
describe('resolveResumeContext$', () => {
  const utxoAt = (txId: string, index: number) =>
    [
      { txId, index },
      { address: BASE_ADDRESS, value: { coins: 1_000_000n } },
    ] as unknown as Cardano.Utxo;

  const rewardAccount =
    'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz';

  const reviewedPlan = {
    chainId,
    protocolParameters: { maxTxSize: 16_384 },
    utxos: [utxoAt('tx-a', 0), utxoAt('tx-a', 1), utxoAt('tx-b', 0)],
    addresses: [
      {
        rewardAccount,
        address: BASE_ADDRESS,
      },
    ],
    signingAccounts: [],
  };

  const resumeState = {
    migrateWallet: { selectReviewedSweepPlan$: of(reviewedPlan) },
    wallets: { selectWalletById$: of(() => wallet) },
  } as unknown as StateObservables;

  it('keeps only live UTxOs that are in the pinned set, matching on txId AND index', async () => {
    // Live set: pinned tx-a#0 survives, tx-a#1 was spent (absent), tx-b#0
    // survives, and tx-c#0 is NEW since review — it must be excluded even
    // though it is spendable, because the user never reviewed it.
    // tx-a#2 shares a pinned txId but not a pinned index.
    const getAccountUtxos = vi
      .fn()
      .mockReturnValue(
        of(
          Ok([
            utxoAt('tx-a', 0),
            utxoAt('tx-a', 2),
            utxoAt('tx-b', 0),
            utxoAt('tx-c', 0),
          ]),
        ),
      );

    return firstValueFrom(
      resolveResumeContext$({ getAccountUtxos } as never)(
        { sourceWalletId: walletId, sourceAccountId: accountId } as never,
        resumeState,
      ),
    ).then(context => {
      expect(
        context.utxos.map(([txIn]) => `${txIn.txId}#${txIn.index}`),
      ).toEqual(['tx-a#0', 'tx-b#0']);
      expect(getAccountUtxos).toHaveBeenCalledWith(
        { rewardAccount },
        { chainId },
      );
    });
  });

  it('propagates a provider error instead of resolving an empty intersection', async () => {
    // Swallowing the error as [] would feed the empty-UTxO branch downstream
    // and mark the sweep done while funds remain on the source.
    const getAccountUtxos = vi
      .fn()
      .mockReturnValue(of(Err(new Error('provider down'))));

    await expect(
      firstValueFrom(
        resolveResumeContext$({ getAccountUtxos } as never)(
          { sourceWalletId: walletId, sourceAccountId: accountId } as never,
          resumeState,
        ),
      ),
    ).rejects.toThrow('provider down');
  });
});
