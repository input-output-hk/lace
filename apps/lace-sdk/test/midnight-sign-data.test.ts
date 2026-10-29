import {
  MidnightAccountId,
  MidnightNetworkId,
} from '@lace-contract/midnight-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { verifySignature } from '@midnight-ntwrk/ledger-v8';
import { createKeystore } from '@midnightntwrk/wallet-sdk-unshielded-wallet';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  MidnightAccountNotFoundError,
  MidnightWalletNotReadyError,
  signMidnightData,
} from '../src/midnight';

import type {
  SignDataOptions,
  SignMidnightDataProps,
  WalletWithMidnight,
} from '../src/midnight';
import type { MidnightWallet } from '@lace-contract/midnight-context';

const accountId = MidnightAccountId(WalletId('signing'), 0, 'preview');
const secondAccountId = MidnightAccountId(WalletId('signing'), 1, 'preview');
const signature = { signature: 'aa', verifyingKey: 'bb' };
const options: SignDataOptions = { encoding: 'text', keyType: 'unshielded' };

const setup = (accounts = [accountId]) => {
  const signData = vi.fn(() => of(signature));
  const secondSignData = vi.fn(() =>
    of({ signature: 'cc', verifyingKey: 'dd' }),
  );
  const wallet = {
    stateObservables: {
      wallets: {
        selectAll$: of([
          {
            accounts: accounts.map(id => ({
              accountId: id,
              blockchainName: 'Midnight',
              accountType: 'InMemory',
              blockchainNetworkId: MidnightNetworkId('preview'),
            })),
          },
        ]),
      },
      network: {
        selectAllActiveNetworkIds$: of([MidnightNetworkId('preview')]),
      },
    },
    _loadModules: async () => [
      of({
        [accountId]: { signData } as unknown as MidnightWallet,
        [secondAccountId]: {
          signData: secondSignData,
        } as unknown as MidnightWallet,
      }),
    ],
  } as unknown as WalletWithMidnight;
  return { wallet, signData, secondSignData };
};

describe('signMidnightData', () => {
  it.each([
    ['text', 'Hello', 'midnight_signed_message:5:Hello'],
    ['hex', '48656c6c6f', 'midnight_signed_message:5:Hello'],
    ['base64', 'SGVsbG8=', 'midnight_signed_message:5:Hello'],
    ['text', 'é😀', 'midnight_signed_message:6:é😀'],
    ['hex', 'c3a9f09f9880', 'midnight_signed_message:6:é😀'],
    ['base64', 'w6nwn5iA', 'midnight_signed_message:6:é😀'],
    ['text', '', 'midnight_signed_message:0:'],
    ['hex', '', 'midnight_signed_message:0:'],
    ['base64', '', 'midnight_signed_message:0:'],
    ['hex', '48656c6c6fzzff', 'midnight_signed_message:5:Hello'],
    ['hex', '486', 'midnight_signed_message:1:H'],
    ['hex', 'zz', 'midnight_signed_message:0:'],
    ['base64', 'S G!VsbG8', 'midnight_signed_message:5:Hello'],
    ['base64', '!!!', 'midnight_signed_message:0:'],
    [
      'text',
      'midnight_signed_message:0:',
      'midnight_signed_message:26:midnight_signed_message:0:',
    ],
  ] as const)(
    'signs connector bytes for %s %j and echoes the original data',
    async (encoding, data, expected) => {
      const { wallet, signData } = setup();
      const result = await signMidnightData(wallet, {
        data,
        options: { ...options, encoding },
      });
      expect(result.unwrap()).toEqual({ data, ...signature });
      expect(signData).toHaveBeenCalledExactlyOnceWith(
        new TextEncoder().encode(expected),
      );
    },
  );

  it('signs arbitrary binary bytes without UTF-8 conversion', async () => {
    const { wallet, signData } = setup();
    await signMidnightData(wallet, {
      data: '00ff80',
      options: { ...options, encoding: 'hex' },
    });
    expect(signData).toHaveBeenCalledExactlyOnceWith(
      new Uint8Array([
        ...new TextEncoder().encode('midnight_signed_message:3:'),
        0,
        255,
        128,
      ]),
    );
  });

  it('binds signing to the selected account', async () => {
    const { wallet, signData, secondSignData } = setup([
      accountId,
      secondAccountId,
    ]);
    const result = await signMidnightData(wallet, {
      accountId: secondAccountId,
      data: 'Hello',
      options,
    });
    expect(result.unwrap()).toEqual({
      data: 'Hello',
      signature: 'cc',
      verifyingKey: 'dd',
    });
    expect(signData).not.toHaveBeenCalled();
    expect(secondSignData).toHaveBeenCalledOnce();
  });

  it.each(['missing', 'wrong', 'ambiguous', 'inactive'] as const)(
    'refuses a %s account without signing',
    async reason => {
      const { wallet, signData, secondSignData } = setup(
        reason === 'missing' ? [] : [accountId, secondAccountId],
      );
      if (reason === 'inactive') {
        wallet.stateObservables.network.selectAllActiveNetworkIds$ = of([]);
      }
      const result = await signMidnightData(wallet, {
        data: 'Hello',
        options,
        ...(reason === 'wrong'
          ? { accountId: MidnightAccountId(WalletId('other'), 0, 'preview') }
          : {}),
      });
      expect(result.isErr() && result.error).toBeInstanceOf(
        MidnightAccountNotFoundError,
      );
      expect(signData).not.toHaveBeenCalled();
      expect(secondSignData).not.toHaveBeenCalled();
    },
  );

  it('refuses an unavailable instance engine', async () => {
    const { wallet, signData } = setup();
    wallet._loadModules =
      (async () => []) as unknown as WalletWithMidnight['_loadModules'];
    const result = await signMidnightData(wallet, {
      data: '',
      options,
      startTimeout: 1,
    });
    expect(result.isErr() && result.error).toBeInstanceOf(
      MidnightWalletNotReadyError,
    );
    expect(signData).not.toHaveBeenCalled();
  });

  it.each([
    [{ encoding: 'utf8', keyType: 'unshielded' }, 'Unsupported encoding: utf8'],
    [
      { encoding: 'text', keyType: 'shielded' },
      'Unsupported key type: shielded',
    ],
  ])(
    'refuses unsupported options %j before signing',
    async (unsupported, message) => {
      const { wallet, signData } = setup();
      const result = await signMidnightData(wallet, {
        data: '',
        options: unsupported,
      } as SignMidnightDataProps);
      expect(result.isErr() && result.error.message).toBe(message);
      expect(signData).not.toHaveBeenCalled();
    },
  );

  it.each([new Error('provider rejected'), 'provider rejected'])(
    'converts provider rejection %j to Error',
    async failure => {
      const { wallet, signData } = setup();
      signData.mockImplementation(() => throwError(() => failure));
      const result = await signMidnightData(wallet, { data: '', options });
      expect(result.isErr() && result.error).toEqual(
        new Error('provider rejected'),
      );
      if (failure instanceof Error)
        expect(result.isErr() && result.error).toBe(failure);
    },
  );

  it('converts synchronous signer failure to Err', async () => {
    const { wallet, signData } = setup();
    signData.mockImplementation(() => {
      throw new Error('locked');
    });
    const result = await signMidnightData(wallet, { data: '', options });
    expect(result.isErr() && result.error.message).toBe('locked');
  });

  it('verifies an actual unshielded signature only for the prefixed bytes and selected key', async () => {
    const { wallet, signData } = setup();
    const keystore = createKeystore(new Uint8Array(32).fill(1), 'preview');
    const other = createKeystore(new Uint8Array(32).fill(2), 'preview');
    signData.mockImplementation((...args: unknown[]) => {
      const bytes = args[0] as Uint8Array;
      return of({
        signature: keystore.signData(bytes),
        verifyingKey: keystore.getPublicKey(),
      });
    });
    const result = (
      await signMidnightData(wallet, { data: 'é😀', options })
    ).unwrap();
    const prefixed = new TextEncoder().encode('midnight_signed_message:6:é😀');
    expect(
      verifySignature(result.verifyingKey, prefixed, result.signature),
    ).toBe(true);
    expect(
      verifySignature(
        result.verifyingKey,
        new TextEncoder().encode(result.data),
        result.signature,
      ),
    ).toBe(false);
    expect(
      verifySignature(other.getPublicKey(), prefixed, result.signature),
    ).toBe(false);
  });
});
