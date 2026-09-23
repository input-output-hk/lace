import {
  CardanoAccountId,
  CardanoPaymentAddress,
} from '@lace-contract/cardano-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it } from 'vitest';

import { pullNextUnusedAddress } from '../src/store/side-effects/pull-next-unused-address';

import type { ActionCreators } from '../src';
import type {
  CardanoAccountAddresses,
  CardanoHostPullDependencies,
} from '../src/augmentations';
import type { Cardano } from '@cardano-sdk/core';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';
import type { LaceResult } from '@lace-lib/extension-shell-api';

const PREPROD = 1;
const WALLET_ID = WalletId('w1');
const ACCOUNT_ID = CardanoAccountId(
  WALLET_ID,
  0,
  PREPROD as Cardano.NetworkMagic,
);
const ACCOUNT_ID_1 = CardanoAccountId(
  WALLET_ID,
  1,
  PREPROD as Cardano.NetworkMagic,
);

const USED =
  'addr_test1qzcczs3ckrfg029ydnnnfrr267dt3x2mpek5vqgw9k0pc6qy9uv5vv6ufxxjua2kchry03ryn34xn54kghx3g29r8xaqp3m7yl';
const UNUSED =
  'addr_test1qqlrq4h2xvj7x49shr65uxrsgkfmpq65la8lpvmxn06gprl6td4s5g30erqzfhnrx8faqtuxl8ruc4a75rxx99twr7fsyfr6t2';
const UNUSED_NEXT =
  'addr_test1wz6zjuut6mx93dw8jvksqx4zh5zul6j8qg992myvw575gdsgwxjuc';

const served = (
  nextUnusedExternal?: string,
): LaceResult<CardanoAccountAddresses> => ({
  ok: true,
  value: {
    addresses: [USED],
    internal: [],
    rewardAccounts: [],
    ...(nextUnusedExternal === undefined ? {} : { nextUnusedExternal }),
  },
});

const REFUSED: LaceResult<CardanoAccountAddresses> = {
  ok: false,
  error: { code: 'internal', message: 'nope' },
};

const cardanoAccount = (accountIndex = 0): AnyAccount =>
  ({
    accountId: CardanoAccountId(
      WALLET_ID,
      accountIndex,
      PREPROD as Cardano.NetworkMagic,
    ),
    walletId: WALLET_ID,
    blockchainName: 'Cardano',
    accountType: 'InMemory',
    networkType: 'testnet',
    blockchainNetworkId: `cardano-${PREPROD}`,
    metadata: { name: `Account ${accountIndex + 1}` },
    blockchainSpecific: {
      accountIndex,
      extendedAccountPublicKey: 'ab'.repeat(64),
      chainId: { networkId: 0, networkMagic: PREPROD },
    },
  } as unknown as AnyAccount);

/** One entry of the guest's discovered address list — all this side effect asks
 * of it is which account the host's walk has already landed for. */
const discovered = (accountId: AccountId, address = USED) => ({
  accountId,
  address: CardanoPaymentAddress(address),
  blockchainName: 'Cardano' as const,
});

type DiscoveredAddress = ReturnType<typeof discovered>;

type Write = { accountId: AccountId; address: string };

/** Records what reached `addresses.setNextUnusedAddress` and answers with a
 * sentinel action, so the marble asserts the stream and the recorded payloads
 * the values. */
const recordingActions = (writes: Write[]) =>
  ({
    addresses: {
      setNextUnusedAddress: (payload: Write) => {
        writes.push(payload);
        return SET;
      },
    },
  } as unknown as ActionCreators);

const SET = { type: 'set' };

const logger = { warn: () => undefined } as unknown as Parameters<
  typeof pullNextUnusedAddress
>[2]['logger'];

/** The wire params the dependency is called with — the (walletId, accountIndex,
 * networkMagic) triple, no accountId. */
type ReadParams = Parameters<
  CardanoHostPullDependencies['getCardanoAddresses']
>[0];

type RunOptions = {
  accounts?: AnyAccount[];
  accountsMarble?: string;
  accountsValues?: Record<string, AnyAccount[]>;
  addresses?: DiscoveredAddress[];
  addressesMarble?: string;
  addressesValues?: Record<string, DiscoveredAddress[]>;
  read?: LaceResult<CardanoAccountAddresses>;
  readFor?: (
    params: ReadParams,
    callIndex: number,
  ) => LaceResult<CardanoAccountAddresses>;
  readMarble?: string;
  expectedMarble: string;
};

const run = ({
  accounts = [cardanoAccount()],
  accountsMarble = 'a',
  accountsValues,
  addresses = [discovered(ACCOUNT_ID)],
  addressesMarble = 'a',
  addressesValues,
  read = served(UNUSED),
  readFor,
  readMarble = '(a|)',
  expectedMarble,
}: RunOptions): { writes: Write[]; reads: ReadParams[] } => {
  const writes: Write[] = [];
  const reads: ReadParams[] = [];
  testSideEffect(pullNextUnusedAddress, ({ cold, expectObservable }) => ({
    actionObservables: {},
    stateObservables: {
      wallets: {
        selectActiveNetworkAccounts$: cold(
          accountsMarble,
          accountsValues ?? { a: accounts },
        ),
      },
      addresses: {
        selectAllAddresses$: cold(
          addressesMarble,
          addressesValues ?? { a: addresses },
        ),
      },
    },
    dependencies: {
      actions: recordingActions(writes),
      getCardanoAddresses: (params: ReadParams) => {
        const callIndex = reads.length;
        reads.push(params);
        return cold(readMarble, { a: readFor?.(params, callIndex) ?? read });
      },
      logger,
    },
    assertion: sideEffect$ => {
      expectObservable(sideEffect$).toBe(expectedMarble, { a: SET });
    },
  }));
  return { writes, reads };
};

describe('cardano-host-pull pullNextUnusedAddress side effect', () => {
  it('records the host-served unused receive address of the account', () => {
    const { writes, reads } = run({ expectedMarble: 'a' });

    // The wire triple only — the accountId stays guest-side bookkeeping.
    expect(reads).toEqual([
      { walletId: WALLET_ID, accountIndex: 0, networkMagic: PREPROD },
    ]);
    expect(writes).toEqual([{ accountId: ACCOUNT_ID, address: UNUSED }]);
  });

  it('waits for the account discovery to land before reading', () => {
    // A read racing the sync's own discovery over a cold host cache would make
    // the host walk (and hit its provider) twice.
    const { writes, reads } = run({ addresses: [], expectedMarble: '' });

    expect(reads).toEqual([]);
    expect(writes).toEqual([]);
  });

  it('reads only for the accounts whose discovery has landed', () => {
    const { writes, reads } = run({
      accounts: [cardanoAccount(), cardanoAccount(1)],
      addresses: [discovered(ACCOUNT_ID_1)],
      expectedMarble: 'a',
    });

    expect(reads.map(read => read.accountIndex)).toEqual([1]);
    expect(writes.map(write => write.accountId)).toEqual([ACCOUNT_ID_1]);
  });

  it('re-reads when the discovered set widens, not when the state merely re-emits', () => {
    const widened = [discovered(ACCOUNT_ID), discovered(ACCOUNT_ID, UNUSED)];
    const { reads } = run({
      accountsMarble: 'a-b',
      accountsValues: {
        // The same account again (a sync round re-emitting the list).
        a: [cardanoAccount()],
        b: [cardanoAccount()],
      },
      addressesMarble: 'a---b',
      addressesValues: { a: [discovered(ACCOUNT_ID)], b: widened },
      readFor: (_, callIndex) => served(callIndex === 0 ? UNUSED : UNUSED_NEXT),
      expectedMarble: 'a---a',
    });

    expect(reads).toHaveLength(2);
  });

  it('supersedes an in-flight read when the discovered set widens under it', () => {
    const { writes, reads } = run({
      addressesMarble: 'a-b',
      addressesValues: {
        a: [discovered(ACCOUNT_ID)],
        b: [discovered(ACCOUNT_ID), discovered(ACCOUNT_ID, UNUSED)],
      },
      // Slower than the widening, so the first read is still open when it lands.
      readMarble: '---(a|)',
      readFor: (_, callIndex) => served(callIndex === 0 ? UNUSED : UNUSED_NEXT),
      expectedMarble: '-----a',
    });

    expect(reads).toHaveLength(2);
    // Only the fresher answer is recorded: the stale one was cancelled mid-read.
    expect(writes).toEqual([{ accountId: ACCOUNT_ID, address: UNUSED_NEXT }]);
  });

  it('records nothing when the host serves no unused address', () => {
    // An older host predating the field, or one holding no Cardano account at
    // that (index, magic): the field stays unset rather than throwing.
    const { writes, reads } = run({
      read: served(undefined),
      expectedMarble: '',
    });

    expect(reads).toHaveLength(1);
    expect(writes).toEqual([]);
  });

  it('swallows a refused read until the next trigger', () => {
    const { writes } = run({ read: REFUSED, expectedMarble: '' });

    expect(writes).toEqual([]);
  });

  it('one account read failing does not lose its siblings unused address', () => {
    const { writes } = run({
      accounts: [cardanoAccount(), cardanoAccount(1)],
      addresses: [discovered(ACCOUNT_ID), discovered(ACCOUNT_ID_1)],
      readFor: params =>
        params.accountIndex === 0 ? REFUSED : served(UNUSED_NEXT),
      expectedMarble: 'a',
    });

    expect(writes).toEqual([{ accountId: ACCOUNT_ID_1, address: UNUSED_NEXT }]);
  });
});
