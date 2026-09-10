import { testSideEffect } from '@lace-lib/util-dev';
import { throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { ACTIVE_NETWORK_PUSH_RETRIES } from '../src/const';
import { pushActiveNetwork } from '../src/store/side-effects/push-active-network';

import { NETWORK_ID } from './fixtures';

import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type {
  LaceResult,
  SetActiveNetworkResult,
} from '@lace-lib/extension-shell-api';

const MAINNET = 'mainnet' as MidnightSDKNetworkId;

const recorded: LaceResult<SetActiveNetworkResult> = {
  ok: true,
  value: { recorded: true },
};

// `lace.request` never rejects — a host-side failure arrives as a typed result.
const refused: LaceResult<SetActiveNetworkResult> = {
  ok: false,
  error: { code: 'internal', message: 'method failed' },
};

describe('midnight-host-pull pushActiveNetwork side effect', () => {
  it('pushes the active Midnight network on boot and dispatches nothing', () => {
    const calls: string[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        midnightContext: {
          selectNetworkId$: cold('a', { a: NETWORK_ID }),
        },
      },
      dependencies: {
        canSetActiveMidnightNetwork: true,
        pushActiveMidnightNetwork: (networkId: string) => {
          calls.push(networkId);
          return cold('(a|)', { a: recorded });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual([NETWORK_ID]);
  });

  it('re-pushes on an active-network change and dedupes an unchanged value', () => {
    const calls: string[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        midnightContext: {
          selectNetworkId$: cold('a 4ms b 4ms c', {
            a: NETWORK_ID,
            b: NETWORK_ID,
            c: MAINNET,
          }),
        },
      },
      dependencies: {
        canSetActiveMidnightNetwork: true,
        pushActiveMidnightNetwork: (networkId: string) => {
          calls.push(networkId);
          return cold('(a|)', { a: recorded });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual([NETWORK_ID, MAINNET]);
  });

  it('no-ops silently against an older host lacking the capability', () => {
    const calls: string[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        midnightContext: {
          selectNetworkId$: cold('a', { a: NETWORK_ID }),
        },
      },
      dependencies: {
        canSetActiveMidnightNetwork: false,
        pushActiveMidnightNetwork: (networkId: string) => {
          calls.push(networkId);
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
    const calls: string[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        midnightContext: {
          selectNetworkId$: cold('a', { a: NETWORK_ID }),
        },
      },
      dependencies: {
        canSetActiveMidnightNetwork: true,
        pushActiveMidnightNetwork: (networkId: string) => {
          calls.push(networkId);
          return throwError(() => new Error('wire down'));
        },
      },
      // No error notification reaches the merged action stream (the swallow).
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toHaveLength(1 + ACTIVE_NETWORK_PUSH_RETRIES);
  });

  it('retries a REFUSED push — the wire answers a typed failure, it never rejects', () => {
    const calls: string[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => {
      let attempt = 0;
      return {
        actionObservables: {},
        stateObservables: {
          midnightContext: {
            selectNetworkId$: cold('a', { a: NETWORK_ID }),
          },
        },
        dependencies: {
          canSetActiveMidnightNetwork: true,
          pushActiveMidnightNetwork: (networkId: string) => {
            calls.push(networkId);
            return cold('(a|)', {
              a: attempt++ === 0 ? refused : recorded,
            });
          },
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('');
        },
      };
    });
    expect(calls).toEqual([NETWORK_ID, NETWORK_ID]);
  });

  it('re-pushes the SAME network after every attempt failed — a failure never advances the dedupe latch', () => {
    const calls: string[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        midnightContext: {
          // The same id again, long after the retries gave up.
          selectNetworkId$: cold('a 59999ms b', {
            a: NETWORK_ID,
            b: NETWORK_ID,
          }),
        },
      },
      dependencies: {
        canSetActiveMidnightNetwork: true,
        pushActiveMidnightNetwork: (networkId: string) => {
          calls.push(networkId);
          return cold('(a|)', { a: refused });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    // Two full attempt runs: the host never recorded the network, so the guest
    // must not treat the value as pushed — otherwise every later dapp connect
    // binds the wrong network for the rest of the session.
    expect(calls).toHaveLength(2 * (1 + ACTIVE_NETWORK_PUSH_RETRIES));
  });

  it('dedupes an unchanged network once the host RECORDED it', () => {
    const calls: string[] = [];
    testSideEffect(pushActiveNetwork, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        midnightContext: {
          selectNetworkId$: cold('a 59999ms b', {
            a: NETWORK_ID,
            b: NETWORK_ID,
          }),
        },
      },
      dependencies: {
        canSetActiveMidnightNetwork: true,
        pushActiveMidnightNetwork: (networkId: string) => {
          calls.push(networkId);
          return cold('(a|)', { a: recorded });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual([NETWORK_ID]);
  });
});
