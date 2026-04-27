/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment */
import { testSideEffect } from '@lace-lib/util-dev';
import { ChannelName } from '@lace-sdk/extension-messaging';
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
                expectSubscriptions(completed$.subscriptions).toBe('^!');

                flush();

                expect(done).toHaveBeenCalledTimes(1);
                expect(done).toHaveBeenCalledWith(false);
              },
            };
          },
        );
      });
    });
  });
});
