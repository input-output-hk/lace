import * as keyManagement from '@cardano-sdk/key-management';
import { AuthSecret } from '@lace-contract/authentication-prompt';
import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { ByteArray, HexBytes } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { RecoveryPhraseRequestError } from '../../src/mnemonic-channel';
import { createRecoveryPhraseSideEffect } from '../../src/store/side-effects';

import type { OnMnemonicRequest } from '../../src/mnemonic-channel';
import type { AccessAuthSecret } from '@lace-contract/authentication-prompt';
import type { AnyWallet, InMemoryWallet } from '@lace-contract/wallet-repo';

vi.mock('@cardano-sdk/key-management', async importOriginal => {
  const original = await importOriginal<
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import('@cardano-sdk/key-management')
  >();
  return {
    ...original,
    emip3decrypt: vi.fn().mockImplementation(original.emip3decrypt),
  };
});

const walletId = WalletId('test-wallet-id');
const password = ByteArray.fromUTF8('pass');
const recoveryPhrase = ByteArray.fromUTF8('mnemonic');

const inMemoryWallet = {
  walletId,
  type: WalletType.InMemory,
  encryptedRecoveryPhrase: HexBytes.fromByteArray(
    await keyManagement.emip3encrypt(recoveryPhrase, password),
  ),
} as InMemoryWallet;

const authenticationPromptConfig = {
  cancellable: true,
  confirmButtonLabel: 'authentication-prompt.confirm-button-label' as never,
  message: 'authentication-prompt.message' as never,
};

// OnMnemonicRequest is not supposed to emmit any value. For the purpose
//  of testing the side effect I am making it passing result from callback
//  to make testing easier
const onMnemonicRequest = ((callback: Parameters<OnMnemonicRequest>[0]) =>
  callback({ walletId, authenticationPromptConfig })) as OnMnemonicRequest;

const authenticate = vi.fn(() => of(true));
const accessAuthSecret = vi.fn<AccessAuthSecret>(callback =>
  callback(AuthSecret.fromUTF8('pass')),
) as AccessAuthSecret;

describe('createRecoveryPhraseSideEffect', () => {
  it('throws when no InMemory wallet is found for the requested walletId', () => {
    testSideEffect(
      createRecoveryPhraseSideEffect(onMnemonicRequest),
      ({ cold, expectObservable }) => ({
        stateObservables: {
          wallets: {
            selectAll$: cold('a', { a: [] }),
          },
        },
        dependencies: {
          authenticate,
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe(
            '#',
            undefined,
            new Error('InMemory wallet not found for recovery phrase'),
          );
        },
      }),
    );
  });

  it('ignores wallets of non-InMemory type when looking up the requested walletId', () => {
    testSideEffect(
      createRecoveryPhraseSideEffect(onMnemonicRequest),
      ({ cold, expectObservable }) => ({
        stateObservables: {
          wallets: {
            selectAll$: cold('a', {
              a: [
                {
                  ...inMemoryWallet,
                  type: WalletType.HardwareLedger,
                  accounts: [],
                } as AnyWallet,
              ],
            }),
          },
        },
        dependencies: {
          authenticate,
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe(
            '#',
            undefined,
            new Error('InMemory wallet not found for recovery phrase'),
          );
        },
      }),
    );
  });

  it('takes only the first snapshot of wallets when handling a request', () => {
    testSideEffect(
      createRecoveryPhraseSideEffect(onMnemonicRequest),
      ({ cold, expectObservable, flush }) => {
        const authenticateLocal = vi.fn(() => cold<boolean>(''));
        return {
          stateObservables: {
            wallets: {
              selectAll$: cold('ab', {
                a: [inMemoryWallet],
                b: [inMemoryWallet],
              }),
            },
          },
          dependencies: {
            authenticate: authenticateLocal,
            accessAuthSecret,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
            flush();

            expect(authenticateLocal).toHaveBeenCalledTimes(1);
          },
        };
      },
    );
  });

  it('passes authenticationPromptConfig from the request to authenticate', () => {
    testSideEffect(
      createRecoveryPhraseSideEffect(onMnemonicRequest),
      ({ cold, expectObservable, flush }) => {
        const authenticateLocal = vi.fn(() => cold<boolean>(''));
        return {
          stateObservables: {
            wallets: {
              selectAll$: cold('a', { a: [inMemoryWallet] }),
            },
          },
          dependencies: {
            authenticate: authenticateLocal,
            accessAuthSecret,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
            flush();

            expect(authenticateLocal).toHaveBeenCalledWith(
              authenticationPromptConfig,
            );
          },
        };
      },
    );
  });

  it('throws when the user cancels the authentication prompt', () => {
    testSideEffect(
      createRecoveryPhraseSideEffect(onMnemonicRequest),
      ({ cold, expectObservable }) => ({
        stateObservables: {
          wallets: {
            selectAll$: cold('a', { a: [inMemoryWallet] }),
          },
        },
        dependencies: {
          authenticate: vi.fn(() => cold('a', { a: false })),
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe(
            '#',
            undefined,
            new RecoveryPhraseRequestError('cancelled'),
          );
        },
      }),
    );
  });

  it('decrypts the recovery phrase using the auth secret after successful authentication', () => {
    const emip3decryptSpy = vi.spyOn(keyManagement, 'emip3decrypt');
    testSideEffect(
      createRecoveryPhraseSideEffect(onMnemonicRequest),
      ({ cold, flush }) => ({
        stateObservables: {
          wallets: {
            selectAll$: cold('a', { a: [inMemoryWallet] }),
          },
        },
        dependencies: {
          authenticate: vi.fn(() => cold('a', { a: true })),
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();

          expect(emip3decryptSpy).toHaveBeenCalledWith(
            ByteArray.fromHex(inMemoryWallet.encryptedRecoveryPhrase),
            AuthSecret.fromUTF8('pass'),
          );
        },
      }),
    );
  });

  it('exposes recovery phrase as ByteArray', () => {
    vi.mocked(keyManagement.emip3decrypt).mockReturnValue({
      // @ts-expect-error just simulating promise here for the rxjs's from
      then: () => [recoveryPhrase],
    });
    testSideEffect(
      createRecoveryPhraseSideEffect(onMnemonicRequest),
      ({ cold, expectObservable }) => ({
        stateObservables: {
          wallets: {
            selectAll$: cold('a', { a: [inMemoryWallet] }),
          },
        },
        dependencies: {
          authenticate: vi.fn(() => cold('a', { a: true })),
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: recoveryPhrase,
          });
        },
      }),
    );
  });
});
