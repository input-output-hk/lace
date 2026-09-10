import { dappConnectorActions, DappId } from '@lace-contract/dapp-connector';
import { generateMockDapp } from '@lace-contract/dapp-connector/test/helpers';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { hydrateAuthorizedDapps } from '../src/store/side-effects/hydrate';

import type { ActionCreators } from '../src';
import type { AuthorizedDappRef } from '../src/lace-client';
import type {
  AuthorizedDappInfo,
  LaceResult,
  RevokeDappResult,
} from '@lace-lib/extension-shell-api';

// The bridge pulls and revokes through INJECTED dependencies (ADR 19), never
// `window.lace` inline — the two stubs stand in for the host calls. Action
// creators are the REAL contract ones (the module dispatches into the
// dapp-connector slice), and the mock dapp comes from the contract's own
// test helpers.

const actions = {
  authorizedDapps: dappConnectorActions.authorizedDapps,
} as unknown as Partial<ActionCreators>;

const dappA = generateMockDapp(DappId('https://dapp-a.example'));
const dappB = generateMockDapp(DappId('https://dapp-b.example'));

const wireEntry = (
  blockchain: string,
  dapp: ReturnType<typeof generateMockDapp>,
): AuthorizedDappInfo => ({
  blockchain,
  dapp: {
    id: dapp.id,
    imageUrl: dapp.imageUrl,
    name: dapp.name,
    origin: dapp.origin,
  },
});

const ok = <T>(value: T): LaceResult<T> => ({ ok: true, value });
const wireError: LaceResult<AuthorizedDappInfo[]> = {
  ok: false,
  error: { code: 'internal', message: 'boom' },
};

type Emitted = { type: string; payload: unknown };

describe('hydrateAuthorizedDapps', () => {
  it('hydrates the slice from dapps.list at init — grouped by blockchain, isPersisted true, unknown buckets skipped', () => {
    testSideEffect(hydrateAuthorizedDapps, ({ cold, flush }) => {
      const pullAuthorizedDapps = vi.fn(() =>
        cold('(a|)', {
          a: ok([
            wireEntry('Cardano', dappA),
            wireEntry('Midnight', dappB),
            // A newer host's bucket this build's BlockchainName union does
            // not know — skipped, never typed in (ADR 41 handshake).
            wireEntry('SomeFutureChain', dappA),
          ]),
        }),
      );
      const emitted: Emitted[] = [];

      return {
        actionObservables: {
          authorizedDapps: {
            authorizedDappsViewed$: cold('-'),
            removeAuthorizedDapp$: cold('-'),
          },
        },
        dependencies: {
          actions,
          canListAuthorizedDapps: true,
          canRevokeAuthorizedDapp: true,
          pullAuthorizedDapps,
          revokeAuthorizedDapp: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(pullAuthorizedDapps).toHaveBeenCalledTimes(1);
          expect(emitted).toEqual([
            dappConnectorActions.authorizedDapps.setAuthorizedDapps({
              Cardano: [
                { blockchain: 'Cardano', dapp: dappA, isPersisted: true },
              ],
              Midnight: [
                { blockchain: 'Midnight', dapp: dappB, isPersisted: true },
              ],
            }),
          ]);
        },
      };
    });
  });

  it('is a silent no-op when the host does not advertise dapps.list (older host)', () => {
    testSideEffect(hydrateAuthorizedDapps, ({ cold, flush }) => {
      const pullAuthorizedDapps = vi.fn();
      const emitted: Emitted[] = [];

      return {
        actionObservables: {
          authorizedDapps: {
            authorizedDappsViewed$: cold('-'),
            removeAuthorizedDapp$: cold('-'),
          },
        },
        dependencies: {
          actions,
          canListAuthorizedDapps: false,
          canRevokeAuthorizedDapp: false,
          pullAuthorizedDapps,
          revokeAuthorizedDapp: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(pullAuthorizedDapps).not.toHaveBeenCalled();
          expect(emitted).toEqual([]);
        },
      };
    });
  });

  it('a failed pull emits nothing — the slice keeps its current state (ADR 15)', () => {
    testSideEffect(hydrateAuthorizedDapps, ({ cold, flush }) => {
      const emitted: Emitted[] = [];

      return {
        actionObservables: {
          authorizedDapps: {
            authorizedDappsViewed$: cold('-'),
            removeAuthorizedDapp$: cold('-'),
          },
        },
        dependencies: {
          actions,
          canListAuthorizedDapps: true,
          canRevokeAuthorizedDapp: true,
          pullAuthorizedDapps: vi.fn(() => cold('(a|)', { a: wireError })),
          revokeAuthorizedDapp: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(emitted).toEqual([]);
        },
      };
    });
  });

  it('on removeAuthorizedDapp: revokes by the origin from the pulled snapshot, then re-pulls and re-hydrates', () => {
    testSideEffect(hydrateAuthorizedDapps, ({ cold, flush }) => {
      // First pull serves both entries; the post-revoke pull serves the
      // host table with the revoked entry gone.
      const pulls = [
        [wireEntry('Cardano', dappA), wireEntry('Cardano', dappB)],
        [wireEntry('Cardano', dappB)],
      ];
      let pull = 0;
      const pullAuthorizedDapps = vi.fn(() =>
        cold('(a|)', { a: ok(pulls[Math.min(pull++, pulls.length - 1)]) }),
      );
      const revokeAuthorizedDapp = vi.fn((_ref: AuthorizedDappRef) =>
        cold('(a|)', { a: ok<RevokeDappResult>({ revoked: true }) }),
      );
      const emitted: Emitted[] = [];

      return {
        actionObservables: {
          authorizedDapps: {
            authorizedDappsViewed$: cold('-'),
            removeAuthorizedDapp$: cold('--r', {
              r: dappConnectorActions.authorizedDapps.removeAuthorizedDapp({
                blockchainName: 'Cardano',
                dapp: { id: dappA.id },
              }),
            }),
          },
        },
        dependencies: {
          actions,
          canListAuthorizedDapps: true,
          canRevokeAuthorizedDapp: true,
          pullAuthorizedDapps,
          revokeAuthorizedDapp,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          // The action carries only the dapp id; the wire revoke is keyed by
          // the origin recovered from the pulled snapshot.
          expect(revokeAuthorizedDapp).toHaveBeenCalledTimes(1);
          expect(revokeAuthorizedDapp).toHaveBeenCalledWith({
            blockchain: 'Cardano',
            origin: dappA.origin,
          });
          expect(pullAuthorizedDapps).toHaveBeenCalledTimes(2);
          expect(emitted).toEqual([
            dappConnectorActions.authorizedDapps.setAuthorizedDapps({
              Cardano: [
                { blockchain: 'Cardano', dapp: dappA, isPersisted: true },
                { blockchain: 'Cardano', dapp: dappB, isPersisted: true },
              ],
            }),
            dappConnectorActions.authorizedDapps.setAuthorizedDapps({
              Cardano: [
                { blockchain: 'Cardano', dapp: dappB, isPersisted: true },
              ],
            }),
          ]);
        },
      };
    });
  });

  it('a removal against a host without dapps.revoke keeps the optimistic local removal (no call, no re-pull)', () => {
    testSideEffect(hydrateAuthorizedDapps, ({ cold, flush }) => {
      const pullAuthorizedDapps = vi.fn(() =>
        cold('(a|)', { a: ok([wireEntry('Cardano', dappA)]) }),
      );
      const revokeAuthorizedDapp = vi.fn();
      const emitted: Emitted[] = [];

      return {
        actionObservables: {
          authorizedDapps: {
            authorizedDappsViewed$: cold('-'),
            removeAuthorizedDapp$: cold('--r', {
              r: dappConnectorActions.authorizedDapps.removeAuthorizedDapp({
                blockchainName: 'Cardano',
                dapp: { id: dappA.id },
              }),
            }),
          },
        },
        dependencies: {
          actions,
          canListAuthorizedDapps: true,
          canRevokeAuthorizedDapp: false,
          pullAuthorizedDapps,
          revokeAuthorizedDapp,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(revokeAuthorizedDapp).not.toHaveBeenCalled();
          expect(pullAuthorizedDapps).toHaveBeenCalledTimes(1);
          expect(emitted).toHaveLength(1);
        },
      };
    });
  });

  it('re-pulls on authorizedDappsViewed — a grant added after boot surfaces on the view open, not the stale boot snapshot', () => {
    testSideEffect(hydrateAuthorizedDapps, ({ cold, flush }) => {
      // Boot pull sees an empty table; by the view open the host has granted
      // the origin (a host-side connect the guest never observed).
      const pulls = [[], [wireEntry('Cardano', dappA)]];
      let pull = 0;
      const pullAuthorizedDapps = vi.fn(() =>
        cold('(a|)', { a: ok(pulls[Math.min(pull++, pulls.length - 1)]) }),
      );
      const emitted: Emitted[] = [];

      return {
        actionObservables: {
          authorizedDapps: {
            authorizedDappsViewed$: cold('--v', {
              v: dappConnectorActions.authorizedDapps.authorizedDappsViewed(),
            }),
            removeAuthorizedDapp$: cold('-'),
          },
        },
        dependencies: {
          actions,
          canListAuthorizedDapps: true,
          canRevokeAuthorizedDapp: true,
          pullAuthorizedDapps,
          revokeAuthorizedDapp: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(pullAuthorizedDapps).toHaveBeenCalledTimes(2);
          expect(emitted).toEqual([
            dappConnectorActions.authorizedDapps.setAuthorizedDapps({}),
            dappConnectorActions.authorizedDapps.setAuthorizedDapps({
              Cardano: [
                { blockchain: 'Cardano', dapp: dappA, isPersisted: true },
              ],
            }),
          ]);
        },
      };
    });
  });

  it('re-pulls on every authorizedDappsViewed — repeated view opens each trigger a fresh pull', () => {
    testSideEffect(hydrateAuthorizedDapps, ({ cold, flush }) => {
      const pullAuthorizedDapps = vi.fn(() =>
        cold('(a|)', { a: ok([wireEntry('Cardano', dappA)]) }),
      );
      const emitted: Emitted[] = [];

      return {
        actionObservables: {
          authorizedDapps: {
            // Two opens after the boot pull.
            authorizedDappsViewed$: cold('-v-v', {
              v: dappConnectorActions.authorizedDapps.authorizedDappsViewed(),
            }),
            removeAuthorizedDapp$: cold('-'),
          },
        },
        dependencies: {
          actions,
          canListAuthorizedDapps: true,
          canRevokeAuthorizedDapp: true,
          pullAuthorizedDapps,
          revokeAuthorizedDapp: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          // Boot pull + one per view open.
          expect(pullAuthorizedDapps).toHaveBeenCalledTimes(3);
          expect(emitted).toHaveLength(3);
        },
      };
    });
  });
});
