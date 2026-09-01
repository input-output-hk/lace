import { HardwareWalletId } from '@lace-contract/wallet-repo';
import { classifyHardwareError } from '@lace-lib/util-hw';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoLedgerDataSigner } from '../../src/signing/cardano-ledger-data-signer';

import type { CardanoLedgerSignerFactoryDependencies } from '../../src/signing/cardano-ledger-signer-factory';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { HardwareWalletLedger } from '@lace-contract/wallet-repo';

const walletId = HardwareWalletId({
  kind: 'usb',
  vendorId: 0x2c_97,
  productId: 0x00_11,
  serialNumber: null,
});

const wallet = { walletId } as unknown as HardwareWalletLedger;

const signCip8Data = vi.fn();
const transportClose = vi.fn();
const createKeyAgent = vi.fn().mockResolvedValue({
  signCip8Data,
  deviceConnection: { transport: { close: transportClose } },
});

const dependencies = {
  transport: { createKeyAgent, getXpub: vi.fn() },
} as unknown as CardanoLedgerSignerFactoryDependencies;

const props = {
  accountIndex: 0,
  chainId: { networkId: 0, networkMagic: 1 } as Cardano.ChainId,
  extendedAccountPublicKey: 'abcd' as unknown as Bip32PublicKeyHex,
  knownAddresses: [] as GroupedAddress[],
  wallet,
};

describe('CardanoLedgerDataSigner', () => {
  beforeEach(() => {
    signCip8Data.mockReset();
    transportClose.mockClear();
    createKeyAgent.mockClear().mockResolvedValue({
      signCip8Data,
      deviceConnection: { transport: { close: transportClose } },
    });
  });

  it('signs via the device key agent and returns the COSE pair', async () => {
    signCip8Data.mockResolvedValue({
      signature: 'cose-sign1-hex',
      key: 'cose-key-hex',
    });

    const signer = new CardanoLedgerDataSigner(props, dependencies);
    const result = await firstValueFrom(
      signer.signData({
        signWith: 'stake_test1abc' as Cardano.RewardAccount,
        payload: 'deadbeef',
      }),
    );

    expect(createKeyAgent).toHaveBeenCalledTimes(1);
    expect(signCip8Data).toHaveBeenCalledWith(
      expect.objectContaining({ payload: 'deadbeef' }),
    );
    expect(result).toEqual({
      signature: 'cose-sign1-hex',
      key: 'cose-key-hex',
    });
    expect(transportClose).toHaveBeenCalledTimes(1);
  });

  it('closes the transport when signing fails and propagates the error', async () => {
    signCip8Data.mockRejectedValue(new Error('device disconnected'));

    const signer = new CardanoLedgerDataSigner(props, dependencies);
    await expect(
      firstValueFrom(
        signer.signData({
          signWith: 'stake_test1abc' as Cardano.RewardAccount,
          payload: 'deadbeef',
        }),
      ),
    ).rejects.toThrow('device disconnected');
    expect(transportClose).toHaveBeenCalledTimes(1);
  });

  it('an outdated Cardano app classifies as version-unsupported, not app-not-open', async () => {
    // ledgerjs gates signMessage per app version and throws
    // DeviceVersionUnsupported; the SDK re-wraps with the cause preserved on
    // innerError, which classifyHardwareError follows.
    const deviceError = new Error(
      'CIP-8 message signing not supported by Ledger app version 6.1.2.',
    );
    deviceError.name = 'DeviceVersionUnsupported';
    const wrapped = new Error('transport failed') as Error & {
      innerError?: unknown;
    };
    wrapped.name = 'TransportError';
    wrapped.innerError = deviceError;
    signCip8Data.mockRejectedValue(wrapped);

    const signer = new CardanoLedgerDataSigner(props, dependencies);
    const thrown = await firstValueFrom(
      signer.signData({
        signWith: 'stake_test1abc' as Cardano.RewardAccount,
        payload: 'deadbeef',
      }),
    ).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(thrown).toBe(wrapped);
    expect(classifyHardwareError(thrown)).toBe('version-unsupported');
  });
});
