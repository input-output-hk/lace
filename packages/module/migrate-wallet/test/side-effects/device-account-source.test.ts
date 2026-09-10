import { WalletType } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

import { makeDeviceAccountSource } from '../../src/store/side-effects/device-account-source';
import { DeviceSigningError } from '../../src/store/side-effects/device-hint';

import type { AnyWallet } from '@lace-contract/wallet-repo';

const NETWORK_ID = 'cardano-preprod' as never;

/**
 * A source backed by a connector that always rejects — the shape every device
 * problem takes: locked, app closed, cable pulled mid-export.
 */
const sourceWithFailingConnector = async (error: Error) => {
  const connectHardwareAccounts = vi.fn(async () => {
    throw error;
  });
  const source = await makeDeviceAccountSource(
    {
      wallet: {
        walletId: 'wallet-1',
        type: WalletType.HardwareLedger,
        accounts: [],
      } as unknown as AnyWallet,
      hwSource: {
        optionId: 'ledger',
        blockchainName: 'Cardano',
        device: { id: 'ledger-1' },
      } as never,
      targetNetworkId: NETWORK_ID,
    },
    {
      __getState: vi.fn(),
      loadModules: vi.fn(async () => [
        [{ blockchainName: 'Cardano', connectHardwareAccounts }],
      ]),
    } as never,
  );
  return { source, connectHardwareAccounts };
};

describe('makeDeviceAccountSource', () => {
  /**
   * The probe shares its stream with the freshness walk's provider calls, and
   * the catcher out there tells them apart by identity. Only this call site
   * knows a device raised the error, so only it can say so.
   */
  it("tags a connector failure as the device's, carrying the classified hint", async () => {
    const { source } = await sourceWithFailingConnector(
      new Error(
        'Cannot communicate with Ledger Cardano App due to DeviceStatusError: General error 0x5515',
      ),
    );

    await expect(source?.xpubForIndex(0)).rejects.toBeInstanceOf(
      DeviceSigningError,
    );
    await expect(source?.xpubForIndex(0)).rejects.toMatchObject({
      hintKey: 'hw-error.device-locked.subtitle',
    });
  });

  /**
   * The factory serves the source scan and the sweep-time re-probe too, whose
   * terminal screens carry their own failure copy — a generic hint there would
   * only restate it. The destination probe adds its generic fallback at its
   * own call site (`asDeviceFailure` in resolve-destination-targets).
   */
  it('passes a failure no category matches through untagged', async () => {
    const inner = new Error('something went sideways on the device');
    const { source } = await sourceWithFailingConnector(inner);

    await expect(source?.xpubForIndex(0)).rejects.toBe(inner);
  });

  it('keeps the original error for the log', async () => {
    const inner = new Error('General error 0x5515');
    const { source } = await sourceWithFailingConnector(inner);

    await expect(source?.xpubForIndex(0)).rejects.toMatchObject({
      innerError: inner,
    });
  });
});
