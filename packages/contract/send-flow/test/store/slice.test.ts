import { describe, expect, it } from 'vitest';

import { sendFlowSelectors } from '../../src/store/slice';

import type { SendFlowStoreState } from '../../src/store/slice';

describe('sendFlowSelectors', () => {
  describe('selectIsSendFlowEnabledForNetworkType', () => {
    it('returns false when payload is undefined (flags not loaded)', () => {
      const state: SendFlowStoreState = {
        sendFlow: {} as never,
        sendFlowConfig: {
          featureFlagPayload: undefined,
        },
      };

      const isEnabled =
        sendFlowSelectors.sendFlowConfig.selectIsSendFlowEnabledForNetworkType(
          state,
          { blockchainName: 'Midnight', networkType: 'mainnet' },
        );

      expect(isEnabled).toBe(false);
    });

    it('returns false when payload is empty (opt-in required)', () => {
      const state: SendFlowStoreState = {
        sendFlow: {} as never,
        sendFlowConfig: {
          featureFlagPayload: {},
        },
      };

      const isEnabled =
        sendFlowSelectors.sendFlowConfig.selectIsSendFlowEnabledForNetworkType(
          state,
          { blockchainName: 'Midnight', networkType: 'mainnet' },
        );

      expect(isEnabled).toBe(false);
    });

    it('returns false when blockchain not in payload (opt-in required)', () => {
      const state: SendFlowStoreState = {
        sendFlow: {} as never,
        sendFlowConfig: {
          featureFlagPayload: {
            Cardano: { mainnet: false, testnet: true },
          },
        },
      };

      const isEnabled =
        sendFlowSelectors.sendFlowConfig.selectIsSendFlowEnabledForNetworkType(
          state,
          { blockchainName: 'Midnight', networkType: 'mainnet' },
        );

      expect(isEnabled).toBe(false);
    });

    it('returns false when networkType not specified (opt-in required)', () => {
      const state: SendFlowStoreState = {
        sendFlow: {} as never,
        sendFlowConfig: {
          featureFlagPayload: {
            Midnight: {},
          },
        },
      };

      const isEnabled =
        sendFlowSelectors.sendFlowConfig.selectIsSendFlowEnabledForNetworkType(
          state,
          { blockchainName: 'Midnight', networkType: 'mainnet' },
        );

      expect(isEnabled).toBe(false);
    });

    it('returns false when explicitly disabled for mainnet', () => {
      const state: SendFlowStoreState = {
        sendFlow: {} as never,
        sendFlowConfig: {
          featureFlagPayload: {
            Midnight: { mainnet: false, testnet: true },
          },
        },
      };

      const isEnabled =
        sendFlowSelectors.sendFlowConfig.selectIsSendFlowEnabledForNetworkType(
          state,
          { blockchainName: 'Midnight', networkType: 'mainnet' },
        );

      expect(isEnabled).toBe(false);
    });

    it('returns true when explicitly enabled for testnet', () => {
      const state: SendFlowStoreState = {
        sendFlow: {} as never,
        sendFlowConfig: {
          featureFlagPayload: {
            Midnight: { mainnet: false, testnet: true },
          },
        },
      };

      const isEnabled =
        sendFlowSelectors.sendFlowConfig.selectIsSendFlowEnabledForNetworkType(
          state,
          { blockchainName: 'Midnight', networkType: 'testnet' },
        );

      expect(isEnabled).toBe(true);
    });

    it('returns false when both mainnet and testnet disabled', () => {
      const state: SendFlowStoreState = {
        sendFlow: {} as never,
        sendFlowConfig: {
          featureFlagPayload: {
            Midnight: { mainnet: false, testnet: false },
          },
        },
      };

      const isMainnetEnabled =
        sendFlowSelectors.sendFlowConfig.selectIsSendFlowEnabledForNetworkType(
          state,
          { blockchainName: 'Midnight', networkType: 'mainnet' },
        );
      const isTestnetEnabled =
        sendFlowSelectors.sendFlowConfig.selectIsSendFlowEnabledForNetworkType(
          state,
          { blockchainName: 'Midnight', networkType: 'testnet' },
        );

      expect(isMainnetEnabled).toBe(false);
      expect(isTestnetEnabled).toBe(false);
    });

    it('returns false when blockchain name is undefined', () => {
      const state: SendFlowStoreState = {
        sendFlow: {} as never,
        sendFlowConfig: {
          featureFlagPayload: {
            Midnight: { mainnet: true, testnet: true },
          },
        },
      };

      const isEnabled =
        sendFlowSelectors.sendFlowConfig.selectIsSendFlowEnabledForNetworkType(
          state,
          { blockchainName: undefined, networkType: 'mainnet' },
        );

      expect(isEnabled).toBe(false);
    });

    it('returns false when network type is undefined', () => {
      const state: SendFlowStoreState = {
        sendFlow: {} as never,
        sendFlowConfig: {
          featureFlagPayload: {
            Midnight: { mainnet: true, testnet: true },
          },
        },
      };

      const isEnabled =
        sendFlowSelectors.sendFlowConfig.selectIsSendFlowEnabledForNetworkType(
          state,
          { blockchainName: 'Midnight', networkType: undefined },
        );

      expect(isEnabled).toBe(false);
    });
  });
});
