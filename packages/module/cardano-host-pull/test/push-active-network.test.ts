import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { testSideEffect } from '@lace-lib/util-dev';
import { throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { pushActiveNetwork } from '../src/store/side-effects/push-active-network';

import type { Cardano } from '@cardano-sdk/core';
import type { NetworkSliceState, NetworkType } from '@lace-contract/network';
import type {
  LaceResult,
  SetActiveNetworkResult,
} from '@lace-lib/extension-shell-api';

const PREPROD = 1 as Cardano.NetworkMagic;
const MAINNET = 764_824_073 as Cardano.NetworkMagic;

type BlockchainNetworks = NetworkSliceState['blockchainNetworks'];

/** A registered Cardano network pair (testnet = Preprod, mainnet = Mainnet). */
const cardanoNetworks = (): BlockchainNetworks => ({
  Cardano: {
    testnet: CardanoNetworkId(PREPROD),
    mainnet: CardanoNetworkId(MAINNET),
  },
});

const recorded: LaceResult<SetActiveNetworkResult> = {
  ok: true,
  value: { recorded: true },
};

// `lace.request` never rejects — a host-side failure arrives as a typed result.
const refused: LaceResult<SetActiveNetworkResult> = {
  ok: false,
  error: { code: 'internal', message: 'method failed' },
};

/** One push plus its retries. */
const ATTEMPTS_PER_PUSH = 4;

describe('cardano-host-pull pushActiveNetwork side effect', () => {
  it('pushes the active Cardano network on boot and dispatches nothing', () => {
    const calls: number[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        network: {
          selectBlockchainNetworks$: cold<BlockchainNetworks>('a', {
            a: cardanoNetworks(),
          }),
          selectNetworkType$: cold<NetworkType>('a', { a: 'testnet' }),
        },
      },
      dependencies: {
        canSetActiveNetwork: true,
        pushActiveCardanoNetwork: (networkMagic: number) => {
          calls.push(networkMagic);
          return cold('(a|)', { a: recorded });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual([PREPROD]);
  });

  it('re-pushes on an active-network change and dedupes an unchanged value', () => {
    const calls: number[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        network: {
          selectBlockchainNetworks$: cold<BlockchainNetworks>('a', {
            a: cardanoNetworks(),
          }),
          // testnet, then testnet again (deduped), then mainnet (re-push).
          selectNetworkType$: cold<NetworkType>('a 4ms b 4ms c', {
            a: 'testnet',
            b: 'testnet',
            c: 'mainnet',
          }),
        },
      },
      dependencies: {
        canSetActiveNetwork: true,
        pushActiveCardanoNetwork: (networkMagic: number) => {
          calls.push(networkMagic);
          return cold('(a|)', { a: recorded });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual([PREPROD, MAINNET]);
  });

  it('no-ops silently against an older host lacking the capability', () => {
    const calls: number[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        network: {
          selectBlockchainNetworks$: cold<BlockchainNetworks>('a', {
            a: cardanoNetworks(),
          }),
          selectNetworkType$: cold<NetworkType>('a', { a: 'testnet' }),
        },
      },
      dependencies: {
        canSetActiveNetwork: false,
        pushActiveCardanoNetwork: (networkMagic: number) => {
          calls.push(networkMagic);
          return cold('(a|)', { a: recorded });
        },
      },
      // Disabled: returns EMPTY (completes at frame 0), never touching the wire.
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('|');
      },
    }));
    expect(calls).toEqual([]);
  });

  it('retries then swallows a wire failure without breaking the guest', () => {
    const calls: number[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        network: {
          selectBlockchainNetworks$: cold<BlockchainNetworks>('a', {
            a: cardanoNetworks(),
          }),
          selectNetworkType$: cold<NetworkType>('a', { a: 'testnet' }),
        },
      },
      dependencies: {
        canSetActiveNetwork: true,
        pushActiveCardanoNetwork: (networkMagic: number) => {
          calls.push(networkMagic);
          return throwError(() => new Error('wire down'));
        },
      },
      // No error notification reaches the merged action stream (the swallow).
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toHaveLength(ATTEMPTS_PER_PUSH);
  });

  it('retries a REFUSED push — the wire answers a typed failure, it never rejects', () => {
    const calls: number[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => {
      let attempt = 0;
      return {
        actionObservables: {},
        stateObservables: {
          network: {
            selectBlockchainNetworks$: cold<BlockchainNetworks>('a', {
              a: cardanoNetworks(),
            }),
            selectNetworkType$: cold<NetworkType>('a', { a: 'testnet' }),
          },
        },
        dependencies: {
          canSetActiveNetwork: true,
          pushActiveCardanoNetwork: (networkMagic: number) => {
            calls.push(networkMagic);
            return cold('(a|)', { a: attempt++ === 0 ? refused : recorded });
          },
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('');
        },
      };
    });
    expect(calls).toEqual([PREPROD, PREPROD]);
  });

  it('re-pushes the SAME network after every attempt failed — a failure never advances the dedupe latch', () => {
    const calls: number[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        network: {
          selectBlockchainNetworks$: cold<BlockchainNetworks>('a', {
            a: cardanoNetworks(),
          }),
          // testnet again, long after the retries gave up.
          selectNetworkType$: cold<NetworkType>('a 59999ms b', {
            a: 'testnet',
            b: 'testnet',
          }),
        },
      },
      dependencies: {
        canSetActiveNetwork: true,
        pushActiveCardanoNetwork: (networkMagic: number) => {
          calls.push(networkMagic);
          return cold('(a|)', { a: refused });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    // Two full attempt runs: the host never recorded the network, so the guest
    // must not treat the value as pushed — otherwise every later dapp grant is
    // validated against the wrong network for the rest of the session.
    expect(calls).toHaveLength(2 * ATTEMPTS_PER_PUSH);
  });

  it('dedupes an unchanged network once the host RECORDED it', () => {
    const calls: number[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        network: {
          selectBlockchainNetworks$: cold<BlockchainNetworks>('a', {
            a: cardanoNetworks(),
          }),
          selectNetworkType$: cold<NetworkType>('a 59999ms b', {
            a: 'testnet',
            b: 'testnet',
          }),
        },
      },
      dependencies: {
        canSetActiveNetwork: true,
        pushActiveCardanoNetwork: (networkMagic: number) => {
          calls.push(networkMagic);
          return cold('(a|)', { a: recorded });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual([PREPROD]);
  });

  it('does not push while no Cardano network is registered yet', () => {
    const calls: number[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        network: {
          selectBlockchainNetworks$: cold<BlockchainNetworks>('a', { a: {} }),
          selectNetworkType$: cold<NetworkType>('a', { a: 'testnet' }),
        },
      },
      dependencies: {
        canSetActiveNetwork: true,
        pushActiveCardanoNetwork: (networkMagic: number) => {
          calls.push(networkMagic);
          return cold('(a|)', { a: recorded });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual([]);
  });
});
