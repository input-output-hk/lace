import { AccountId } from '@lace-contract/wallet-repo';
import { verifySignature } from '@midnight-ntwrk/ledger-v8';
import { createKeystore } from '@midnightntwrk/wallet-sdk/unshielded';
import { secp256k1 } from '@noble/curves/secp256k1';
import { defer, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MidnightDappConnectorApi } from '../../src/store/dependencies/midnight-dapp-connector-api';

import type { MidnightSignDataOptions } from '../../src/types';
import type { MidnightWallet } from '@lace-contract/midnight-context';

const accountId = AccountId('scheme-test');
const sender = { sender: { url: 'https://test.example' } };
const setup = () => {
  const keystores = {
    schnorr: createKeystore(
      { kind: 'schnorr', secret: new Uint8Array(32).fill(1) },
      'undeployed',
    ),
    ecdsa: createKeystore(
      { kind: 'ecdsa', secret: new Uint8Array(32).fill(2) },
      'undeployed',
    ),
  };
  const signData = vi.fn(
    (bytes: Uint8Array, scheme: 'ecdsa' | 'schnorr' = 'schnorr') =>
      defer(async () => ({
        signature: await keystores[scheme].signDataAsync(bytes),
        verifyingKey: keystores[scheme].getPublicKey(),
      })),
  );
  const confirmation = vi.fn().mockResolvedValue({ isConfirmed: true });
  const api = new MidnightDappConnectorApi({
    wallets$: of({
      [accountId]: { accountId, signData } as unknown as MidnightWallet,
    }),
    network$: of({
      networkId: 'undeployed',
      config: {
        nodeAddress: 'ws://localhost:9944',
        indexerAddress: 'http://localhost:8088',
        proofServer: { kind: 'in-process' },
      },
    }),
    supportedNetworksIds$: of(['undeployed']),
    isUnlocked$: of(true),
    getAccountIdForOrigin: () => accountId,
    userConfirmTransaction: confirmation,
  });
  return { api, signData, confirmation };
};

describe('connector signature scheme selection', () => {
  it.each([undefined, 'schnorr_bip340'] as const)(
    'keeps Schnorr for %s and signs the domain-separated payload',
    async scheme => {
      const { api, signData, confirmation } = setup();
      const result = await api.signData(
        'Hello',
        { encoding: 'text', keyType: 'unshielded', scheme },
        sender,
      );
      const bytes = new TextEncoder().encode('midnight_signed_message:5:Hello');
      expect(result.scheme).toBe('schnorr_bip340');
      expect(
        verifySignature(result.verifyingKey, bytes, result.signature),
      ).toBe(true);
      expect(
        verifySignature(
          result.verifyingKey,
          new TextEncoder().encode('Hello'),
          result.signature,
        ),
      ).toBe(false);
      expect(signData).toHaveBeenCalledExactlyOnceWith(bytes, 'schnorr');
      expect(confirmation).toHaveBeenCalledWith(
        sender.sender,
        'signData',
        expect.objectContaining({ signDataScheme: 'schnorr_bip340' }),
      );
    },
  );

  it('requests ECDSA explicitly and verifies it independently', async () => {
    const { api, signData, confirmation } = setup();
    const result = await api.signData(
      'Hello',
      {
        encoding: 'text',
        keyType: 'unshielded',
        scheme: 'ecdsa_secp256k1_sha256',
      },
      sender,
    );
    const bytes = new TextEncoder().encode('midnight_signed_message:5:Hello');
    expect(result.scheme).toBe('ecdsa_secp256k1_sha256');
    expect(
      secp256k1.verify(
        Buffer.from(result.signature, 'hex'),
        bytes,
        Buffer.from(result.verifyingKey, 'hex'),
        { prehash: true },
      ),
    ).toBe(true);
    expect(
      secp256k1.verify(
        Buffer.from(result.signature, 'hex'),
        new TextEncoder().encode('Hello'),
        Buffer.from(result.verifyingKey, 'hex'),
        { prehash: true },
      ),
    ).toBe(false);
    expect(signData).toHaveBeenCalledExactlyOnceWith(bytes, 'ecdsa');
    expect(confirmation).toHaveBeenCalledWith(
      sender.sender,
      'signData',
      expect.objectContaining({ signDataScheme: 'ecdsa_secp256k1_sha256' }),
    );
  });

  it('rejects an unsupported scheme before confirmation or signing', async () => {
    const { api, signData, confirmation } = setup();
    await expect(
      api.signData(
        'Hello',
        {
          encoding: 'text',
          keyType: 'unshielded',
          scheme: 'unknown',
        } as unknown as MidnightSignDataOptions,
        sender,
      ),
    ).rejects.toThrow('Unsupported signature scheme');
    expect(confirmation).not.toHaveBeenCalled();
    expect(signData).not.toHaveBeenCalled();
  });

  it('rejects a signer that returns a different scheme from the request', async () => {
    const { api, signData } = setup();
    signData.mockReturnValue(
      of({
        signature: { tag: 'schnorr', value: 'aa' },
        verifyingKey: { tag: 'schnorr', value: 'bb' },
      }) as never,
    );
    await expect(
      api.signData(
        'Hello',
        {
          encoding: 'text',
          keyType: 'unshielded',
          scheme: 'ecdsa_secp256k1_sha256',
        },
        sender,
      ),
    ).rejects.toThrow('schemes do not match');
  });

  it('does not sign after the user rejects ECDSA', async () => {
    const { api, signData, confirmation } = setup();
    confirmation.mockResolvedValue({ isConfirmed: false });
    await expect(
      api.signData(
        'Hello',
        {
          encoding: 'text',
          keyType: 'unshielded',
          scheme: 'ecdsa_secp256k1_sha256',
        },
        sender,
      ),
    ).rejects.toThrow('User rejected');
    expect(signData).not.toHaveBeenCalled();
  });
});
