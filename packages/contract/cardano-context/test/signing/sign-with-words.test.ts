import { Cardano } from '@cardano-sdk/core';
import { firstValueFrom, from, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardanoInMemoryDataSigner } from '../../src/signing/cardano-in-memory-data-signer';
import { CardanoInMemoryTransactionSigner } from '../../src/signing/cardano-in-memory-transaction-signer';
import {
  createCardanoKeyAgentFromMnemonic,
  deriveDRepKeyHash,
} from '../../src/signing/cardano-key-agent';
import {
  AccountKeyMismatchError,
  deriveCardanoAccountPublicKeyFromWords,
  signCardanoDataWithWords,
  signCardanoTransactionWithWords,
} from '../../src/signing/sign-with-words';

import {
  address,
  extendedAccountPublicKey,
  knownAddresses,
  mainnet,
  serializedTx,
  utxo,
  words,
} from './sign-with-words.fixtures';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';

const account = {
  words,
  knownAddresses,
  accountIndex: 0,
  chainId: Cardano.ChainIds.Preprod,
  extendedAccountPublicKey,
};

const auth = { authenticate: () => of(true) } as never;

describe('signCardanoTransactionWithWords', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('signs like the in-memory transaction signer over the same account', async () => {
    const result = await signCardanoTransactionWithWords({
      ...account,
      serializedTx,
      utxo,
    });

    const keyAgent = await createCardanoKeyAgentFromMnemonic({
      accountIndex: 0,
      chainId: Cardano.ChainIds.Preprod,
      mnemonicWords: words,
    });
    try {
      const expected = await firstValueFrom(
        new CardanoInMemoryTransactionSigner({
          withKeyAgent$: use => use(keyAgent),
          knownAddresses,
          utxo,
          auth,
        }).sign({ serializedTx }),
      );
      expect(result.signatureCount).toBe(1);
      expect(result).toEqual(expected);
    } finally {
      keyAgent.dispose?.();
    }
  });

  it('signs a mainnet transaction for the matching account', async () => {
    const result = await signCardanoTransactionWithWords({
      ...account,
      ...mainnet,
    });
    expect(result.signatureCount).toBe(1);
    expect(result.serializedTx).not.toBe(mainnet.serializedTx);
  });

  it('rejects words that derive another account key and disposes the agent', async () => {
    const passphrase = new Uint8Array(32).fill(7);
    vi.spyOn(crypto, 'getRandomValues').mockImplementationOnce(
      () => passphrase,
    );

    await expect(
      signCardanoTransactionWithWords({
        ...account,
        extendedAccountPublicKey: '0'.repeat(128) as Bip32PublicKeyHex,
        serializedTx,
        utxo,
      }),
    ).rejects.toBeInstanceOf(AccountKeyMismatchError);
    expect(passphrase).toEqual(new Uint8Array(32));
  });

  it('disposes the agent after a successful signature', async () => {
    const passphrase = new Uint8Array(32).fill(7);
    vi.spyOn(crypto, 'getRandomValues').mockImplementationOnce(
      () => passphrase,
    );

    await signCardanoTransactionWithWords({ ...account, serializedTx, utxo });
    expect(passphrase).toEqual(new Uint8Array(32));
  });
});

describe('deriveCardanoAccountPublicKeyFromWords', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('derives the key the in-memory wallet stores for the account', async () => {
    await expect(
      deriveCardanoAccountPublicKeyFromWords({ words, accountIndex: 0 }),
    ).resolves.toBe(extendedAccountPublicKey);
  });

  it('derives the same key whichever network the account is used on', async () => {
    const keyAgent = await createCardanoKeyAgentFromMnemonic({
      accountIndex: 0,
      chainId: Cardano.ChainIds.Preprod,
      mnemonicWords: words,
    });
    try {
      await expect(
        deriveCardanoAccountPublicKeyFromWords({ words, accountIndex: 0 }),
      ).resolves.toBe(keyAgent.extendedAccountPublicKey);
    } finally {
      keyAgent.dispose?.();
    }
  });

  it('derives a different key per account index', async () => {
    const first = await deriveCardanoAccountPublicKeyFromWords({
      words,
      accountIndex: 1,
    });
    expect(first).toMatch(/^[\da-f]{128}$/);
    expect(first).not.toBe(extendedAccountPublicKey);
  });

  it('disposes the agent once the key is derived', async () => {
    const passphrase = new Uint8Array(32).fill(7);
    vi.spyOn(crypto, 'getRandomValues').mockImplementationOnce(
      () => passphrase,
    );

    await deriveCardanoAccountPublicKeyFromWords({ words, accountIndex: 0 });
    expect(passphrase).toEqual(new Uint8Array(32));
  });
});

describe('signCardanoDataWithWords', () => {
  it('signs like the in-memory data signer over the same account', async () => {
    const request = { signWith: address, payload: 'deadbeef' };
    const result = await signCardanoDataWithWords({ ...account, ...request });

    const keyAgent = await createCardanoKeyAgentFromMnemonic({
      accountIndex: 0,
      chainId: Cardano.ChainIds.Preprod,
      mnemonicWords: words,
    });
    try {
      const expected = await firstValueFrom(
        new CardanoInMemoryDataSigner({
          withKeyAgent$: use => use(keyAgent),
          dRepKeyHash$: from(deriveDRepKeyHash(account)),
          knownAddresses,
          auth,
        }).signData(request),
      );
      expect(result).toEqual(expected);
    } finally {
      keyAgent.dispose?.();
    }
  });

  it('signs data for a mainnet address', async () => {
    const result = await signCardanoDataWithWords({ ...account, ...mainnet });
    expect(result.signature).toMatch(/^[\da-f]+$/);
    expect(result.key).toMatch(/^[\da-f]+$/);
  });

  it('rejects words that derive another account key', async () => {
    await expect(
      signCardanoDataWithWords({
        ...account,
        extendedAccountPublicKey: '0'.repeat(128) as Bip32PublicKeyHex,
        signWith: address,
        payload: 'deadbeef',
      }),
    ).rejects.toBeInstanceOf(AccountKeyMismatchError);
  });
});
