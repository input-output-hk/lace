/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment */
import { ChannelName } from '@lace-lib/extension-messaging';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER, of } from 'rxjs';
import { dummyLogger as logger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { dappConnectorActions, DappId } from '../../src';
import { createAuthorizeDappSideEffect } from '../../src/store/side-effects';
import { generateMockDapp } from '../helpers';

import type { DappConnectorApiAuthenticator } from '../../src';

describe('dapp-connector/side-effects', () => {
  const midnightAuthenticator: DappConnectorApiAuthenticator = {
    baseChannelName: ChannelName('midnight'),
    blockchainName: 'Midnight',
  };

  const cardanoAuthenticator: DappConnectorApiAuthenticator = {
    baseChannelName: ChannelName('cardano'),
    blockchainName: 'Cardano',
  };

  describe('createAuthorizeDappSideEffect', () => {
    it('connects each authenticator with options including hasAccounts', () => {
      testSideEffect(
        createAuthorizeDappSideEffect([
          midnightAuthenticator,
          cardanoAuthenticator,
        ]),
        ({ flush, cold, hot, expectObservable }) => {
          const connectAuthenticator = vi.fn().mockReturnValue(cold(''));
          return {
            actionObservables: {
              authorizeDapp: {
                completed$: hot(''),
                failed$: hot(''),
              },
            },
            stateObservables: {
              dappConnector: {
                selectAuthorizedDapps$: hot('a', { a: {} }),
              },
              wallets: {
                selectActiveNetworkAccounts$: hot('a', { a: [] }),
              },
            },
            dependencies: {
              actions: dappConnectorActions,
              logger,
              connectAuthenticator,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('');

              flush();

              expect(connectAuthenticator).toHaveBeenCalledTimes(2);
              expect(connectAuthenticator).toHaveBeenCalledWith(
                expect.objectContaining({
                  baseChannelName: midnightAuthenticator.baseChannelName,
                  blockchainName: midnightAuthenticator.blockchainName,
                  authorizedDapps$: expect.anything(),
                  hasAccounts: expect.any(Function),
                }),
              );
              expect(connectAuthenticator).toHaveBeenCalledWith(
                expect.objectContaining({
                  baseChannelName: cardanoAuthenticator.baseChannelName,
                  blockchainName: cardanoAuthenticator.blockchainName,
                  authorizedDapps$: expect.anything(),
                  hasAccounts: expect.any(Function),
                }),
              );
            },
          };
        },
      );
    });

    describe('authorized dapp completed', () => {
      it('calls authenticator request "done"', () => {
        testSideEffect(
          createAuthorizeDappSideEffect([midnightAuthenticator]),
          ({ flush, hot, expectObservable }) => {
            const done = vi.fn();
            const dapp = generateMockDapp(DappId('dapp-id'));
            const authorized = true;
            const connectAuthenticator = vi
              .fn()
              .mockReturnValue(hot('a', { a: { done, dapp } }));
            return {
              actionObservables: {
                authorizeDapp: {
                  completed$: hot('-b', {
                    b: dappConnectorActions.authorizeDapp.completed({
                      dapp,
                      blockchainName: 'Midnight',
                      authorized,
                    }),
                  }),
                  failed$: hot(''),
                },
              },
              stateObservables: {
                dappConnector: {
                  selectAuthorizedDapps$: hot('a', { a: {} }),
                },
                wallets: {
                  selectActiveNetworkAccounts$: hot('a', { a: [] }),
                },
              },
              dependencies: {
                actions: dappConnectorActions,
                logger,
                connectAuthenticator,
              },
              assertion: sideEffect$ => {
                expectObservable(sideEffect$).toBe('a', {
                  a: dappConnectorActions.authorizeDapp.start({
                    blockchainName: midnightAuthenticator.blockchainName,
                    dapp,
                  }),
                });

                flush();

                expect(done).toHaveBeenCalledTimes(1);
                expect(done).toHaveBeenCalledWith(authorized);
              },
            };
          },
        );
      });
    });

    describe('in-flight request cancelled (dapp disconnected)', () => {
      it('frees the serialized queue so a queued request is processed when a prior in-flight request is cancelled', () => {
        testSideEffect(
          createAuthorizeDappSideEffect([midnightAuthenticator]),
          ({ flush, cold, hot, expectObservable }) => {
            const doneA = vi.fn();
            const doneB = vi.fn();
            const dappA = generateMockDapp(DappId('dapp-a'));
            const dappB = generateMockDapp(DappId('dapp-b'));
            const requestA = {
              done: doneA,
              dapp: dappA,
              cancelled$: cold<void>('--(c|)', { c: undefined }),
            };
            const requestB = { done: doneB, dapp: dappB };
            const connectAuthenticator = vi
              .fn()
              .mockReturnValue(hot('ab', { a: requestA, b: requestB }));
            return {
              actionObservables: {
                authorizeDapp: {
                  completed$: hot('----d', {
                    d: dappConnectorActions.authorizeDapp.completed({
                      dapp: dappB,
                      blockchainName: 'Midnight',
                      authorized: true,
                    }),
                  }),
                  failed$: hot(''),
                },
              },
              stateObservables: {
                dappConnector: {
                  selectAuthorizedDapps$: hot('a', { a: {} }),
                },
                wallets: {
                  selectActiveNetworkAccounts$: hot('a', { a: [] }),
                },
              },
              dependencies: {
                actions: dappConnectorActions,
                logger,
                connectAuthenticator,
              },
              assertion: sideEffect$ => {
                expectObservable(sideEffect$).toBe('a-(fb)', {
                  a: dappConnectorActions.authorizeDapp.start({
                    blockchainName: midnightAuthenticator.blockchainName,
                    dapp: dappA,
                  }),
                  f: dappConnectorActions.authorizeDapp.failed({
                    dapp: dappA,
                    reason: 'connection dropped',
                  }),
                  b: dappConnectorActions.authorizeDapp.start({
                    blockchainName: midnightAuthenticator.blockchainName,
                    dapp: dappB,
                  }),
                });

                flush();

                expect(doneA).toHaveBeenCalledTimes(1);
                expect(doneA).toHaveBeenCalledWith(false);
                expect(doneB).toHaveBeenCalledTimes(1);
                expect(doneB).toHaveBeenCalledWith(true);
              },
            };
          },
        );
      });
    });

    describe('request already cancelled when the queue reaches it', () => {
      it('suppresses start (no prompt opens) and advances the queue when cancelled$ has already fired at activation', () => {
        testSideEffect(
          createAuthorizeDappSideEffect([midnightAuthenticator]),
          ({ flush, hot, expectObservable }) => {
            const doneA = vi.fn();
            const doneB = vi.fn();
            const dappA = generateMockDapp(DappId('dapp-a'));
            const dappB = generateMockDapp(DappId('dapp-b'));
            // of(undefined) replays synchronously on subscribe, modelling a port
            // already gone by the time the queue activates this request.
            const requestA = {
              done: doneA,
              dapp: dappA,
              cancelled$: of(undefined),
            };
            const requestB = { done: doneB, dapp: dappB };
            const connectAuthenticator = vi
              .fn()
              .mockReturnValue(hot('ab', { a: requestA, b: requestB }));
            return {
              actionObservables: {
                authorizeDapp: {
                  completed$: hot('--d', {
                    d: dappConnectorActions.authorizeDapp.completed({
                      dapp: dappB,
                      blockchainName: 'Midnight',
                      authorized: true,
                    }),
                  }),
                  failed$: hot(''),
                },
              },
              stateObservables: {
                dappConnector: {
                  selectAuthorizedDapps$: hot('a', { a: {} }),
                },
                wallets: {
                  selectActiveNetworkAccounts$: hot('a', { a: [] }),
                },
              },
              dependencies: {
                actions: dappConnectorActions,
                logger,
                connectAuthenticator,
              },
              assertion: sideEffect$ => {
                expectObservable(sideEffect$).toBe('-b', {
                  b: dappConnectorActions.authorizeDapp.start({
                    blockchainName: midnightAuthenticator.blockchainName,
                    dapp: dappB,
                  }),
                });

                flush();

                expect(doneA).toHaveBeenCalledTimes(1);
                expect(doneA).toHaveBeenCalledWith(false);
                expect(doneB).toHaveBeenCalledTimes(1);
                expect(doneB).toHaveBeenCalledWith(true);
              },
            };
          },
        );
      });
    });

    describe('normal completion with an active cancellation watch', () => {
      it('processes a queued request after a prior request whose cancelled$ never fires completes normally', () => {
        // Guards against the cancellation watch keeping the concatMap inner
        // alive after a normal resolve — else only one prompt shows until reload.
        testSideEffect(
          createAuthorizeDappSideEffect([midnightAuthenticator]),
          ({ flush, hot, expectObservable }) => {
            const doneA = vi.fn();
            const doneB = vi.fn();
            const dappA = generateMockDapp(DappId('dapp-a'));
            const dappB = generateMockDapp(DappId('dapp-b'));
            const requestA = { done: doneA, dapp: dappA, cancelled$: NEVER };
            const requestB = { done: doneB, dapp: dappB };
            const connectAuthenticator = vi
              .fn()
              .mockReturnValue(hot('ab', { a: requestA, b: requestB }));
            return {
              actionObservables: {
                authorizeDapp: {
                  completed$: hot('--c--d', {
                    c: dappConnectorActions.authorizeDapp.completed({
                      dapp: dappA,
                      blockchainName: 'Midnight',
                      authorized: true,
                    }),
                    d: dappConnectorActions.authorizeDapp.completed({
                      dapp: dappB,
                      blockchainName: 'Midnight',
                      authorized: true,
                    }),
                  }),
                  failed$: hot(''),
                },
              },
              stateObservables: {
                dappConnector: {
                  selectAuthorizedDapps$: hot('a', { a: {} }),
                },
                wallets: {
                  selectActiveNetworkAccounts$: hot('a', { a: [] }),
                },
              },
              dependencies: {
                actions: dappConnectorActions,
                logger,
                connectAuthenticator,
              },
              assertion: sideEffect$ => {
                expectObservable(sideEffect$).toBe('a-b', {
                  a: dappConnectorActions.authorizeDapp.start({
                    blockchainName: midnightAuthenticator.blockchainName,
                    dapp: dappA,
                  }),
                  b: dappConnectorActions.authorizeDapp.start({
                    blockchainName: midnightAuthenticator.blockchainName,
                    dapp: dappB,
                  }),
                });

                flush();

                expect(doneA).toHaveBeenCalledWith(true);
                expect(doneB).toHaveBeenCalledWith(true);
              },
            };
          },
        );
      });
    });

    describe('authorized dapp failed', () => {
      it('calls authenticator request "done" with "false" and unsubscribes from completed$', () => {
        testSideEffect(
          createAuthorizeDappSideEffect([midnightAuthenticator]),
          ({ flush, hot, expectObservable, expectSubscriptions }) => {
            const done = vi.fn();
            const dapp = generateMockDapp(DappId('dapp-id'));
            const connectAuthenticator = vi
              .fn()
              .mockReturnValue(hot('a', { a: { done, dapp } }));
            const completed$ =
              hot<
                ReturnType<typeof dappConnectorActions.authorizeDapp.completed>
              >('');
            return {
              actionObservables: {
                authorizeDapp: {
                  completed$,
                  failed$: hot('-b', {
                    b: dappConnectorActions.authorizeDapp.failed({
                      dapp,
                      reason: 'some error',
                    }),
                  }),
                },
              },
              stateObservables: {
                dappConnector: {
                  selectAuthorizedDapps$: hot('a', { a: {} }),
                },
                wallets: {
                  selectActiveNetworkAccounts$: hot('a', { a: [] }),
                },
              },
              dependencies: {
                actions: dappConnectorActions,
                logger,
                connectAuthenticator,
              },
              assertion: sideEffect$ => {
                expectObservable(sideEffect$).toBe('a', {
                  a: dappConnectorActions.authorizeDapp.start({
                    blockchainName: midnightAuthenticator.blockchainName,
                    dapp,
                  }),
                });
                // `completed$` now has two subscribers: the lifetime
                // reject-cooldown tracker (stays subscribed) and the
                // per-request inner, which is torn down here when `failed$`
                // fires (the original assertion — second entry).
                expectSubscriptions(completed$.subscriptions).toBe(['^', '^!']);

                flush();

                expect(done).toHaveBeenCalledTimes(1);
                expect(done).toHaveBeenCalledWith(false);
              },
            };
          },
        );
      });
    });

    describe('reject cooldown (#2288)', () => {
      it('declines a repeat request from a recently-rejected origin without re-prompting', () => {
        testSideEffect(
          createAuthorizeDappSideEffect([cardanoAuthenticator]),
          ({ flush, hot, expectObservable }) => {
            const done1 = vi.fn();
            const done2 = vi.fn();
            const dapp = generateMockDapp(DappId('dapp-id'));
            // request #1 at frame 0; request #2 (a re-fired enable()) at frame
            // 3 — within the 2s cooldown that the reject at frame 1 starts.
            const connectAuthenticator = vi.fn().mockReturnValue(
              hot('a--b', {
                a: { done: done1, dapp },
                b: { done: done2, dapp },
              }),
            );
            return {
              actionObservables: {
                authorizeDapp: {
                  completed$: hot('-r', {
                    r: dappConnectorActions.authorizeDapp.completed({
                      dapp,
                      authorized: false,
                    }),
                  }),
                  failed$: hot(''),
                },
              },
              stateObservables: {
                dappConnector: {
                  selectAuthorizedDapps$: hot('a', { a: {} }),
                },
                wallets: {
                  selectActiveNetworkAccounts$: hot('a', { a: [] }),
                },
              },
              dependencies: {
                actions: dappConnectorActions,
                logger,
                connectAuthenticator,
              },
              assertion: sideEffect$ => {
                // Only request #1 opens a prompt (one `start`); request #2 is
                // declined silently while the origin is cooling off.
                expectObservable(sideEffect$).toBe('a', {
                  a: dappConnectorActions.authorizeDapp.start({
                    blockchainName: cardanoAuthenticator.blockchainName,
                    dapp,
                  }),
                });

                flush();

                expect(done1).toHaveBeenCalledWith(false);
                expect(done2).toHaveBeenCalledTimes(1);
                expect(done2).toHaveBeenCalledWith(false);
              },
            };
          },
        );
      });

      it('prompts again once the reject cooldown has elapsed', () => {
        testSideEffect(
          createAuthorizeDappSideEffect([cardanoAuthenticator]),
          ({ flush, hot }) => {
            const done1 = vi.fn();
            const done2 = vi.fn();
            const dapp = generateMockDapp(DappId('dapp-id'));
            // request #1 at frame 0, rejected at frame 1 (cooldown ends at
            // frame 1001); request #2 at frame ~1014 — past the window.
            const connectAuthenticator = vi.fn().mockReturnValue(
              hot('a 1010ms b', {
                a: { done: done1, dapp },
                b: { done: done2, dapp },
              }),
            );
            return {
              actionObservables: {
                authorizeDapp: {
                  completed$: hot('-r', {
                    r: dappConnectorActions.authorizeDapp.completed({
                      dapp,
                      authorized: false,
                    }),
                  }),
                  failed$: hot(''),
                },
              },
              stateObservables: {
                dappConnector: {
                  selectAuthorizedDapps$: hot('a', { a: {} }),
                },
                wallets: {
                  selectActiveNetworkAccounts$: hot('a', { a: [] }),
                },
              },
              dependencies: {
                actions: dappConnectorActions,
                logger,
                connectAuthenticator,
              },
              assertion: sideEffect$ => {
                const startType = dappConnectorActions.authorizeDapp.start({
                  blockchainName: cardanoAuthenticator.blockchainName,
                  dapp,
                }).type;
                const emissions: Array<{ type: string }> = [];
                sideEffect$.subscribe(action =>
                  emissions.push(action as { type: string }),
                );

                flush();

                // Both requests prompt: the second arrives after the cooldown.
                expect(
                  emissions.filter(action => action.type === startType),
                ).toHaveLength(2);
              },
            };
          },
        );
      });
    });
  });
});
