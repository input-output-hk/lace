import {
  AuthenticatorError,
  AuthenticatorErrorCode,
} from '@lace-contract/dapp-connector';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCardanoWalletApi,
  type CardanoWalletApiObject,
} from '../src/browser/cardano-wallet-api';
import { APIErrorCode } from '../src/common/api-error';
import {
  CIP30_API_VERSION,
  FEATURE_FLAG_CARDANO_DAPP_CONNECTOR,
  WALLET_ICON,
} from '../src/common/const';

import type { Cip30FullWalletApi } from '../src/browser/types';
import type { FeatureFlagProbe } from '@lace-contract/dapp-connector';
import type { RemoteAuthenticator } from '@lace-sdk/dapp-connector';

// Mock browser globals for Node.js test environment
Object.defineProperty(globalThis, 'location', {
  value: {
    origin: 'https://test-dapp.com',
    href: 'https://test-dapp.com/page',
  },
  writable: true,
});

describe('CardanoWalletApi', () => {
  const mockLogger = dummyLogger;

  const createMockApi = (): Cip30FullWalletApi => ({
    getNetworkId: vi.fn().mockResolvedValue(1),
    getUtxos: vi.fn().mockResolvedValue([]),
    getCollateral: vi.fn().mockResolvedValue(null),
    getBalance: vi.fn().mockResolvedValue('00'),
    getUsedAddresses: vi.fn().mockResolvedValue([]),
    getUnusedAddresses: vi.fn().mockResolvedValue([]),
    getChangeAddress: vi.fn().mockResolvedValue('addr_test1...'),
    getRewardAddresses: vi.fn().mockResolvedValue([]),
    getExtensions: vi.fn().mockResolvedValue([{ cip: 95 }, { cip: 142 }]),
    signTx: vi.fn().mockResolvedValue('witnessset'),
    signData: vi.fn().mockResolvedValue({ signature: 'sig', key: 'key' }),
    submitTx: vi.fn().mockResolvedValue('txhash'),
    cip95: {
      getPubDRepKey: vi.fn().mockRejectedValue(new Error('Not implemented')),
      getRegisteredPubStakeKeys: vi
        .fn()
        .mockRejectedValue(new Error('Not implemented')),
      getUnregisteredPubStakeKeys: vi
        .fn()
        .mockRejectedValue(new Error('Not implemented')),
    },
    cip142: {
      getNetworkMagic: vi.fn().mockResolvedValue(1),
    },
    experimental: {
      getCollateral: vi.fn().mockResolvedValue(null),
    },
  });

  const createMockAuthenticator = (
    haveAccessResult: boolean = false,
    requestAccessResult: boolean = true,
  ): RemoteAuthenticator => ({
    haveAccess: vi.fn().mockResolvedValue(haveAccessResult),
    requestAccess: vi.fn().mockResolvedValue(requestAccessResult),
  });

  const createMockFeatureFlagProbe = (enabled = true): FeatureFlagProbe => ({
    getFeatureFlags: vi
      .fn()
      .mockResolvedValue(
        enabled ? [{ key: FEATURE_FLAG_CARDANO_DAPP_CONNECTOR }] : [],
      ),
  });

  let mockApi: Cip30FullWalletApi;
  let mockAuthenticator: ReturnType<typeof createMockAuthenticator>;
  let mockFeatureFlagProbe: FeatureFlagProbe;
  let walletApi: CardanoWalletApiObject;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApi();
    mockAuthenticator = createMockAuthenticator();
    mockFeatureFlagProbe = createMockFeatureFlagProbe();
    walletApi = createCardanoWalletApi(
      { name: 'lace' },
      {
        logger: mockLogger,
        authenticator: mockAuthenticator,
        api: mockApi,
        featureFlagProbe: mockFeatureFlagProbe,
      },
    );
  });

  describe('static properties', () => {
    it('should have apiVersion set to the configured value', () => {
      expect(walletApi.apiVersion).toBe(CIP30_API_VERSION);
    });

    it('should have name set to the configured value', () => {
      expect(walletApi.name).toBe('lace');
    });

    it('should have icon set to default wallet icon when not specified', () => {
      expect(walletApi.icon).toBe(WALLET_ICON);
    });

    it('should have icon set to the configured value', () => {
      const customIcon = 'data:image/png;base64,abc123';
      const walletWithIcon = createCardanoWalletApi(
        { name: 'lace', icon: customIcon },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );
      expect(walletWithIcon.icon).toBe(customIcon);
    });

    it('should have supportedExtensions with CIP-95 and CIP-142', () => {
      expect(walletApi.supportedExtensions).toEqual([
        { cip: 95 },
        { cip: 142 },
      ]);
    });
  });

  describe('isEnabled', () => {
    it('should return false before enable() is called', async () => {
      const isEnabledResult = await walletApi.isEnabled();

      expect(isEnabledResult).toBe(false);
      // haveAccess is not called - we track session state locally
      expect(mockAuthenticator.haveAccess).not.toHaveBeenCalled();
    });

    it('should return true after enable() succeeds', async () => {
      mockAuthenticator = createMockAuthenticator(false, true);
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      // Before enable
      expect(await walletApi.isEnabled()).toBe(false);

      // Call enable
      await walletApi.enable();

      // After successful enable
      expect(await walletApi.isEnabled()).toBe(true);
    });

    it('should remain false if enable() is denied', async () => {
      mockAuthenticator = createMockAuthenticator(false, false);
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      // Before enable
      expect(await walletApi.isEnabled()).toBe(false);

      // Call enable - should throw
      await expect(walletApi.enable()).rejects.toMatchObject({
        code: APIErrorCode.Refused,
      });

      // After denied enable - still false
      expect(await walletApi.isEnabled()).toBe(false);
    });
  });

  describe('enable', () => {
    it('should always request access and return enabled API on approval', async () => {
      // enable() always calls requestAccess to show the auth popup
      // This ensures user always confirms the connection
      const logDebugSpy = vi.spyOn(mockLogger, 'debug');
      mockAuthenticator = createMockAuthenticator(false, true);
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      const enabledApi = await walletApi.enable();

      // haveAccess is not called - we always show the popup
      expect(mockAuthenticator.haveAccess).not.toHaveBeenCalled();
      expect(mockAuthenticator.requestAccess).toHaveBeenCalledTimes(1);
      expect(logDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('has been granted access'),
      );
      expect(enabledApi).toHaveProperty('getNetworkId');
      expect(enabledApi).toHaveProperty('getUtxos');
      expect(enabledApi).toHaveProperty('getBalance');
      expect(enabledApi).toHaveProperty('getUsedAddresses');
      expect(enabledApi).toHaveProperty('getUnusedAddresses');
      expect(enabledApi).toHaveProperty('getChangeAddress');
      expect(enabledApi).toHaveProperty('getRewardAddresses');
      expect(enabledApi).toHaveProperty('signTx');
      expect(enabledApi).toHaveProperty('signData');
      expect(enabledApi).toHaveProperty('submitTx');
      expect(enabledApi).toHaveProperty('cip95');
      expect(enabledApi.cip95).toHaveProperty('getPubDRepKey');
      expect(enabledApi.cip95).toHaveProperty('getRegisteredPubStakeKeys');
      expect(enabledApi.cip95).toHaveProperty('getUnregisteredPubStakeKeys');
      expect(enabledApi).toHaveProperty('cip142');
      expect(enabledApi.cip142).toHaveProperty('getNetworkMagic');
      expect(enabledApi).toHaveProperty('experimental');
      expect(enabledApi.experimental).toHaveProperty('getCollateral');
    });

    it('should throw APIError when access is denied', async () => {
      mockAuthenticator = createMockAuthenticator(false, false);
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      await expect(walletApi.enable()).rejects.toMatchObject({
        code: APIErrorCode.Refused,
        info: 'Access to wallet API denied',
      });

      // haveAccess is not called - we always show the popup
      expect(mockAuthenticator.haveAccess).not.toHaveBeenCalled();
      expect(mockAuthenticator.requestAccess).toHaveBeenCalledTimes(1);
    });

    it('should return methods that call the underlying API', async () => {
      mockAuthenticator = createMockAuthenticator(false, true);
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      const enabledApi = await walletApi.enable();

      // Test that methods are properly bound
      const networkId = await enabledApi.getNetworkId();
      expect(networkId).toBe(1);
      expect(mockApi.getNetworkId).toHaveBeenCalled();

      const balance = await enabledApi.getBalance();
      expect(balance).toBe('00');
      expect(mockApi.getBalance).toHaveBeenCalled();
    });

    it('should accept extensions parameter (currently unused)', async () => {
      mockAuthenticator = createMockAuthenticator(false, true);
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      // Should not throw when extensions are passed
      const enabledApi = await walletApi.enable([{ cip: 30 }]);
      expect(enabledApi).toHaveProperty('getNetworkId');
    });

    it('should throw APIError with InternalError when authenticator throws NoWalletAvailable', async () => {
      mockAuthenticator = {
        haveAccess: vi.fn().mockResolvedValue(false),
        requestAccess: vi
          .fn()
          .mockRejectedValue(
            new AuthenticatorError(
              AuthenticatorErrorCode.NoWalletAvailable,
              'No wallet available for Cardano',
            ),
          ),
      };
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      await expect(walletApi.enable()).rejects.toMatchObject({
        code: APIErrorCode.InternalError,
        info: 'No Cardano wallet available. Please create or restore a wallet first.',
      });
    });

    it('should translate serialized AuthenticatorError (by shape) to APIError', async () => {
      // Simulates how the error looks after crossing the messaging boundary:
      // instanceof won't work, but name + code are preserved
      const serializedError = Object.assign(new Error('No wallet'), {
        name: 'AuthenticatorError',
        code: AuthenticatorErrorCode.NoWalletAvailable,
      });
      mockAuthenticator = {
        haveAccess: vi.fn().mockResolvedValue(false),
        requestAccess: vi.fn().mockRejectedValue(serializedError),
      };
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      await expect(walletApi.enable()).rejects.toMatchObject({
        code: APIErrorCode.InternalError,
      });
    });

    it('should re-throw unexpected errors from authenticator', async () => {
      const unexpectedError = new Error('Network failure');
      mockAuthenticator = {
        haveAccess: vi.fn().mockResolvedValue(false),
        requestAccess: vi.fn().mockRejectedValue(unexpectedError),
      };
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      await expect(walletApi.enable()).rejects.toThrow('Network failure');
    });

    it('should return cached API without calling requestAccess on subsequent enable() calls', async () => {
      mockAuthenticator = createMockAuthenticator(false, true);
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      const firstApi = await walletApi.enable();
      const secondApi = await walletApi.enable();

      expect(mockAuthenticator.requestAccess).toHaveBeenCalledTimes(1);
      expect(secondApi).toBe(firstApi);
    });

    it('should deduplicate concurrent enable() calls into a single requestAccess', async () => {
      mockAuthenticator = createMockAuthenticator(false, true);
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      const [firstApi, secondApi] = await Promise.all([
        walletApi.enable(),
        walletApi.enable(),
      ]);

      expect(mockAuthenticator.requestAccess).toHaveBeenCalledTimes(1);
      expect(secondApi).toBe(firstApi);
    });

    it('should retry requestAccess after a previous denial', async () => {
      mockAuthenticator = {
        haveAccess: vi.fn().mockResolvedValue(false),
        requestAccess: vi
          .fn()
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true),
      };
      walletApi = createCardanoWalletApi(
        { name: 'lace' },
        {
          logger: mockLogger,
          authenticator: mockAuthenticator,
          api: mockApi,
          featureFlagProbe: mockFeatureFlagProbe,
        },
      );

      await expect(walletApi.enable()).rejects.toMatchObject({
        code: APIErrorCode.Refused,
      });

      const enabledApi = await walletApi.enable();

      expect(mockAuthenticator.requestAccess).toHaveBeenCalledTimes(2);
      expect(enabledApi).toHaveProperty('getNetworkId');
    });
  });
});
