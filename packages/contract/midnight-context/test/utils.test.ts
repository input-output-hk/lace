import { describe, expect, it } from 'vitest';

import {
  convertHttpUrlToWebsocket,
  getDustTankStatus,
  getNightTokenTickerByNetwork,
  isMidnightNetworkConfig,
  isMidnightNetworksConfig,
  isPartialMidnightNetworkConfig,
  isPartialMidnightNetworksConfig,
  getValidNetworkStringPayload,
  MidnightSDKNetworkIds,
  type NetworkStringPayloadFeatureFlag,
} from '../src';

const testCases = [
  {
    input: 'http://localhost:8088/api/v3/graphql',
    output: 'ws://localhost:8088/api/v3/graphql/ws',
  },
  {
    input: 'https://indexer.preview.midnight.network/api/v3/graphql',
    output: 'wss://indexer.preview.midnight.network/api/v3/graphql/ws',
  },
];

describe('utils', () => {
  it.each(testCases)(
    'convertHttpUrlToWebsocket should return the correct websocket url',
    data => {
      expect(convertHttpUrlToWebsocket(data.input)).toBe(data.output);
    },
  );

  describe('isMidnightNetworkConfig', () => {
    it('should return true for valid MidnightNetworkConfig', () => {
      expect(
        isMidnightNetworkConfig({
          nodeAddress: 'http://localhost:9944',
          proofServerAddress: 'http://localhost:6300',
          indexerAddress: 'http://localhost:8088/api/v3/graphql',
        }),
      ).toBe(true);

      expect(
        isMidnightNetworkConfig({
          nodeAddress: 'http://localhost:9944',
          proofServerAddress: 'http://localhost:6300',
          indexerAddress: 'http://localhost:8088/api/v3/graphql',
          loremIpsumDolor: 'sit amet',
        }),
      ).toBe(true);
    });

    it('should return false for invalid MidnightNetworkConfig', () => {
      expect(isMidnightNetworkConfig(null)).toBe(false);
      expect(isMidnightNetworkConfig({})).toBe(false);

      expect(
        isMidnightNetworkConfig({
          nodeAddress: 'http://localhost:9944',
          proofServerAddress: 'http://localhost:6300',
        }),
      ).toBe(false);
    });
  });

  describe('isPartialMidnightNetworkConfig', () => {
    it('should return true for valid Partial<MidnightNetworkConfig>', () => {
      expect(isPartialMidnightNetworkConfig({})).toBe(true);
      expect(
        isPartialMidnightNetworkConfig({
          nodeAddress: 'http://localhost:9944',
          proofServerAddress: 'http://localhost:6300',
        }),
      ).toBe(true);

      expect(
        isPartialMidnightNetworkConfig({
          nodeAddress: 'http://localhost:9944',
          proofServerAddress: 'http://localhost:6300',
        }),
      ).toBe(true);

      expect(
        isPartialMidnightNetworkConfig({
          nodeAddress: 'http://localhost:9944',
          proofServerAddress: 'http://localhost:6300',
          indexerAddress: 'http://localhost:8088/api/v3/graphql',
        }),
      ).toBe(true);
    });

    it('should return false for invalid Partial<MidnightNetworkConfig>', () => {
      expect(isPartialMidnightNetworkConfig(null)).toBe(false);

      expect(
        isPartialMidnightNetworkConfig({
          loremIpsumDolor: 'http://localhost:9944',
        }),
      ).toBe(false);

      expect(
        isPartialMidnightNetworkConfig({
          nodeAddress: 'http://localhost:9944',
          proofServerAddress: 'http://localhost:6300',
          indexerAddress: 'http://localhost:8088/api/v3/graphql',
          loremIpsumDolor: 'sit amet',
        }),
      ).toBe(false);
    });
  });

  describe('isMidnightNetworksConfig', () => {
    it('should return true for valid MidnightNetworksConfig', () => {
      expect(
        isMidnightNetworksConfig({
          [MidnightSDKNetworkIds.Preview]: {
            nodeAddress: 'https://rpc.preview.midnight.network',
            proofServerAddress: 'http://localhost:6300',
            indexerAddress:
              'https://indexer.preview.midnight.network/api/v3/graphql',
          },
        }),
      ).toBe(true);

      expect(
        isMidnightNetworksConfig({
          [MidnightSDKNetworkIds.Preview]: {
            nodeAddress: 'https://rpc.preview.midnight.network',
            proofServerAddress: 'http://localhost:6300',
            indexerAddress:
              'https://indexer.preview.midnight.network/api/v3/graphql',
          },
          [MidnightSDKNetworkIds.Undeployed]: {
            nodeAddress: 'http://localhost:9944',
            proofServerAddress: 'http://localhost:6300',
            indexerAddress: 'http://localhost:8088/api/v3/graphql',
          },
        }),
      ).toBe(true);
    });

    it('should return false for invalid MidnightNetworksConfig', () => {
      expect(isMidnightNetworksConfig(null)).toBe(false);
      expect(isMidnightNetworksConfig({})).toBe(false);

      expect(
        isMidnightNetworksConfig({
          [MidnightSDKNetworkIds.Preview]: {
            nodeAddress: 'https://rpc.preview.midnight.network',
            proofServerAddress: 'http://localhost:6300',
          },
        }),
      ).toBe(false);

      expect(
        isMidnightNetworksConfig({
          MainNet: {
            nodeAddress: 'http://localhost:9944',
            proofServerAddress: 'http://localhost:6300',
            indexerAddress: 'http://localhost:8088/api/v3/graphql',
          },
          [MidnightSDKNetworkIds.Undeployed]: {
            nodeAddress: 'http://localhost:9944',
            indexerAddress: 'http://localhost:8088/api/v3/graphql',
          },
        }),
      ).toBe(false);
    });
  });

  describe('isPartialMidnightNetworksConfig', () => {
    it('should return true for valid Partial<MidnightNetworksConfig>', () => {
      expect(isPartialMidnightNetworksConfig({})).toBe(true);

      expect(
        isPartialMidnightNetworksConfig({
          [MidnightSDKNetworkIds.Preview]: {},
        }),
      ).toBe(true);

      expect(
        isPartialMidnightNetworksConfig({
          [MidnightSDKNetworkIds.Preview]: {
            nodeAddress: 'https://rpc.preview.midnight.network',
            proofServerAddress: 'http://localhost:6300',
          },
        }),
      ).toBe(true);

      expect(
        isPartialMidnightNetworksConfig({
          [MidnightSDKNetworkIds.Preview]: {
            nodeAddress: 'https://rpc.preview.midnight.network',
            proofServerAddress: 'http://localhost:6300',
          },
          [MidnightSDKNetworkIds.Undeployed]: {
            nodeAddress: 'http://localhost:9944',
            proofServerAddress: 'http://localhost:6300',
            indexerAddress: 'http://localhost:8088/api/v3/graphql',
          },
        }),
      ).toBe(true);
    });

    it('should return false for invalid Partial<MidnightNetworksConfig>', () => {
      expect(isPartialMidnightNetworksConfig(null)).toBe(false);

      expect(
        isPartialMidnightNetworksConfig({
          MainNet: {},
          [MidnightSDKNetworkIds.Undeployed]: {
            nodeAddress: 'http://localhost:9944',
            indexerAddress: 'http://localhost:8088/api/v3/graphql',
            loremIpsumDolor: 'sit amet',
          },
        }),
      ).toBe(false);
    });
  });

  describe('getValidNetworkStringPayload', () => {
    const supportedNetworkIds = [
      MidnightSDKNetworkIds.Preview,
      MidnightSDKNetworkIds.MainNet,
    ];

    it('should return valid payload for supported network IDs', () => {
      const featureFlag = {
        key: 'BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER',
        payload: {
          [MidnightSDKNetworkIds.Preview]:
            'http://proofserver.preview.midnight.network:6300',
          [MidnightSDKNetworkIds.MainNet]:
            'http://proofserver.mainnet.midnight.network:6300',
        },
      } as NetworkStringPayloadFeatureFlag;

      const result = getValidNetworkStringPayload(
        supportedNetworkIds,
        featureFlag,
      );

      expect(result).toEqual({
        [MidnightSDKNetworkIds.Preview]:
          'http://proofserver.preview.midnight.network:6300',
        [MidnightSDKNetworkIds.MainNet]:
          'http://proofserver.mainnet.midnight.network:6300',
      });
    });

    it('should filter out unsupported network IDs and non-string values', () => {
      const featureFlag = {
        key: 'BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER',
        payload: {
          [MidnightSDKNetworkIds.Preview]:
            'http://proofserver.preview.midnight.network:6300',
          [MidnightSDKNetworkIds.MainNet]: 123,
          999: 'http://unsupported.network:6300', // Unsupported network ID
        },
      } as unknown as NetworkStringPayloadFeatureFlag;

      const result = getValidNetworkStringPayload(
        supportedNetworkIds,
        featureFlag,
      );

      expect(result).toEqual({
        [MidnightSDKNetworkIds.Preview]:
          'http://proofserver.preview.midnight.network:6300',
      });
      expect(result).not.toHaveProperty('999');
      expect(result).not.toHaveProperty('3');
    });

    it('should return empty object', () => {
      const featureFlagWithoutPayload = {
        key: 'BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER',
      } as NetworkStringPayloadFeatureFlag;

      expect(
        getValidNetworkStringPayload(
          supportedNetworkIds,
          featureFlagWithoutPayload,
        ),
      ).toEqual({});
      expect(
        getValidNetworkStringPayload(
          supportedNetworkIds,
          null as unknown as NetworkStringPayloadFeatureFlag,
        ),
      ).toEqual({});
      expect(
        getValidNetworkStringPayload(
          supportedNetworkIds,
          undefined as unknown as NetworkStringPayloadFeatureFlag,
        ),
      ).toEqual({});

      const featureFlagWithPayloadNull = {
        key: 'BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER',
        payload: null,
      } as unknown as NetworkStringPayloadFeatureFlag;

      expect(
        getValidNetworkStringPayload(
          supportedNetworkIds,
          featureFlagWithPayloadNull,
        ),
      ).toEqual({});

      const featureFlagWithPayloadNotAnObject = {
        key: 'BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER',
        payload: 'not an object',
      } as unknown as NetworkStringPayloadFeatureFlag;

      expect(
        getValidNetworkStringPayload(
          supportedNetworkIds,
          featureFlagWithPayloadNotAnObject,
        ),
      ).toEqual({});

      const featureFlagWithEmptyPayload = {
        key: 'BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER',
        payload: {},
      } as NetworkStringPayloadFeatureFlag;

      expect(
        getValidNetworkStringPayload(
          supportedNetworkIds,
          featureFlagWithEmptyPayload,
        ),
      ).toEqual({});
    });

    it('should handle string network IDs correctly', () => {
      const featureFlag = {
        key: 'BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER',
        payload: {
          [MidnightSDKNetworkIds.Preview]:
            'http://proofserver.preview.midnight.network:6300', // String network ID
          [MidnightSDKNetworkIds.MainNet]:
            'http://proofserver.mainnet.midnight.network:6300', // String network ID
        },
      } as NetworkStringPayloadFeatureFlag;

      const result = getValidNetworkStringPayload(
        supportedNetworkIds,
        featureFlag,
      );

      expect(result).toEqual({
        [MidnightSDKNetworkIds.Preview]:
          'http://proofserver.preview.midnight.network:6300',
        [MidnightSDKNetworkIds.MainNet]:
          'http://proofserver.mainnet.midnight.network:6300',
      });
    });
  });

  describe('getNightTokenTickerByNetwork', () => {
    it("returns 'NIGHT' for mainnet", () => {
      expect(getNightTokenTickerByNetwork('mainnet')).toBe('NIGHT');
    });

    it("returns 'tNIGHT' for testnet", () => {
      expect(getNightTokenTickerByNetwork('testnet')).toBe('tNIGHT');
    });

    it("returns 'NIGHT' when networkType is undefined", () => {
      expect(getNightTokenTickerByNetwork(undefined)).toBe('NIGHT');
    });
  });

  describe('getDustTankStatus', () => {
    it("returns 'empty' when value === 0n && maxValue === 0n", () => {
      expect(getDustTankStatus(0n, 0n)).toBe('empty');
    });

    it("returns 'refilling' when value < maxValue", () => {
      expect(getDustTankStatus(0n, 100n)).toBe('refilling');
      expect(getDustTankStatus(50n, 100n)).toBe('refilling');
      expect(getDustTankStatus(99n, 100n)).toBe('refilling');
    });

    it("returns 'filled' when value === maxValue", () => {
      expect(getDustTankStatus(100n, 100n)).toBe('filled');
      expect(getDustTankStatus(1n, 1n)).toBe('filled');
    });

    it("returns 'decaying' when value > maxValue", () => {
      expect(getDustTankStatus(101n, 100n)).toBe('decaying');
      expect(getDustTankStatus(200n, 100n)).toBe('decaying');
    });

    describe('edge cases', () => {
      it('handles large bigint values', () => {
        const largeValue = 1_000_000_000_000_000_000n;
        const largerValue = 2_000_000_000_000_000_000n;

        expect(getDustTankStatus(largeValue, largerValue)).toBe('refilling');
        expect(getDustTankStatus(largeValue, largeValue)).toBe('filled');
        expect(getDustTankStatus(largerValue, largeValue)).toBe('decaying');
      });

      it('handles value just below max', () => {
        expect(getDustTankStatus(999_999n, 1_000_000n)).toBe('refilling');
      });

      it('handles value just above max', () => {
        expect(getDustTankStatus(1_000_001n, 1_000_000n)).toBe('decaying');
      });
    });
  });
});
