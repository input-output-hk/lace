/* eslint-disable import/order, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
// eslint-disable-next-line
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import type { AnyAddress } from '@lace-contract/addresses';
import type { BitcoinAddressData } from '@lace-contract/bitcoin-context';
import type { AppConfig } from '@lace-contract/module';

vi.mock('@lace-lib/ui-toolkit', () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

import { openUrl } from '@lace-lib/ui-toolkit';
import activitiesListUiCustomisation from '../../src/exposed-modules/activities-item-ui-customisation';

const config = {
  bitcoinExplorerUrls: {
    ['mainnet']: 'https://mempool.space',
    ['testnet4']: 'https://mempool.space/testnet4',
  },
} as unknown as AppConfig;

describe('activities-item-ui-customisation', () => {
  describe('uiCustomisationSelector', () => {
    it('should return true for Bitcoin blockchain', () => {
      const customisation = activitiesListUiCustomisation();
      const shouldBeTrue = customisation.uiCustomisationSelector({
        blockchainName: 'Bitcoin',
      });
      expect(shouldBeTrue).toBe(true);
    });

    it('should return false for non-Bitcoin blockchain', () => {
      const customisation = activitiesListUiCustomisation();
      const shouldBeFalse = customisation.uiCustomisationSelector({
        blockchainName: 'Cardano',
      });
      expect(shouldBeFalse).toBe(false);
    });
  });

  describe('getExplorerUrl', () => {
    beforeEach(() => {});
    afterEach(() => {
      vi.restoreAllMocks();
    });
    const mockAddress = {
      data: { network: BitcoinNetwork.Mainnet },
    } as unknown as AnyAddress<BitcoinAddressData>;

    it('should return empty string when config is not provided', () => {
      const customisation = activitiesListUiCustomisation();
      const shouldBeEmpty = customisation.getExplorerUrl({
        config: undefined,
        address: mockAddress,
        activityId: 'tx123',
      });
      expect(shouldBeEmpty).toBe('');
    });

    it('should return empty string when address data is not available', () => {
      const customisation = activitiesListUiCustomisation();
      const shouldBeEmpty = customisation.getExplorerUrl({
        config,
        address: { ...mockAddress, data: undefined },
        activityId: 'tx123',
      });
      expect(shouldBeEmpty).toBe('');
    });

    it('should return correct explorer URL', () => {
      const customisation = activitiesListUiCustomisation();
      const shouldBeMainnetUrl = customisation.getExplorerUrl({
        config,
        address: mockAddress,
        activityId: 'tx123',
      });
      expect(shouldBeMainnetUrl).toBe('https://mempool.space/tx/tx123');
    });
  });

  describe('onActivityClick', () => {
    const mockAddress = {
      data: { network: BitcoinNetwork.Mainnet },
    } as unknown as AnyAddress<BitcoinAddressData>;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does nothing (does not call openUrl) when getExplorerUrl returns empty', () => {
      const customisation = activitiesListUiCustomisation();

      customisation.onActivityClick!({
        config: undefined,
        address: mockAddress,
        activityId: 'tx123',
      });

      expect(openUrl).not.toHaveBeenCalled();
    });

    it('calls openUrl with computed URL for mainnet', () => {
      const customisation = activitiesListUiCustomisation();

      customisation.onActivityClick!({
        config,
        address: mockAddress,
        activityId: 'tx123',
      });

      expect(openUrl).toHaveBeenCalledTimes(1);
      const args = (openUrl as unknown as Mock).mock.calls[0][0];
      expect(args.url).toBe('https://mempool.space/tx/tx123');
      expect(typeof args.onError).toBe('function');
    });

    it('encodes activityId via encodeURIComponent', () => {
      const customisation = activitiesListUiCustomisation();
      const activityId = 'abc/def?x=1';

      customisation.onActivityClick!({
        config,
        address: mockAddress,
        activityId,
      });

      const args = (openUrl as unknown as Mock).mock.calls[0][0];
      expect(args.url).toBe(
        `https://mempool.space/tx/${encodeURIComponent(activityId)}`,
      );
    });

    it('provides a no-op onError that does not throw if invoked', async () => {
      (openUrl as unknown as Mock).mockImplementationOnce(
        async ({ onError }) => {
          onError(new Error('boom'));
        },
      );

      const customisation = activitiesListUiCustomisation();

      expect(() => {
        customisation.onActivityClick!({
          config,
          address: mockAddress,
          activityId: 'tx123',
        });
      }).not.toThrow();

      expect(openUrl).toHaveBeenCalledTimes(1);
    });
  });
});
