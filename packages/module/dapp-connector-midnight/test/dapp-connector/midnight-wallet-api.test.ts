import {
  AuthenticatorError,
  AuthenticatorErrorCode,
} from '@lace-contract/dapp-connector';
import { ErrorCodes } from '@midnight-ntwrk/dapp-connector-api';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APIError } from '../../src/api-error';
import { FEATURE_FLAG_MIDNIGHT_DAPP_CONNECTOR } from '../../src/const';
import { MidnightWalletApi } from '../../src/midnight-wallet-api';

import { testWalletApi, testWalletProperties } from './testWallet';

import type { FeatureFlagProbe } from '@lace-contract/dapp-connector';
import type { RemoteAuthenticator } from '@lace-sdk/dapp-connector';
import type { Mock } from 'vitest';

export const stubAuthenticator = () => {
  let isEnabled = false;
  return {
    haveAccess: vi.fn().mockImplementation(async () => isEnabled),
    requestAccess: vi.fn().mockImplementation(async () => {
      isEnabled = true;
      return isEnabled;
    }),
  } as unknown as RemoteAuthenticator;
};

const stubFeatureFlagProbe = (enabled = true): FeatureFlagProbe => ({
  getFeatureFlags: vi
    .fn()
    .mockResolvedValue(
      enabled ? [{ key: FEATURE_FLAG_MIDNIGHT_DAPP_CONNECTOR }] : [],
    ),
});

Object.defineProperty(global, 'location', {
  value: {
    href: 'http://localhost',
  },
});

describe('MidnightWalletApi', () => {
  const logger = dummyLogger;
  let authenticator: RemoteAuthenticator;
  let walletApi: MidnightWalletApi;

  beforeEach(() => {
    authenticator = stubAuthenticator();
    walletApi = new MidnightWalletApi(testWalletProperties, {
      api: testWalletApi,
      authenticator,
      featureFlagProbe: stubFeatureFlagProbe(true),
      logger,
    });
  });

  it('constructed state', async () => {
    expect(walletApi.name).toBe(testWalletProperties.name);
    expect(walletApi.icon).toBe('');
    expect(walletApi.apiVersion).toBe('4.0.1');
    expect(walletApi.connect).toBeInstanceOf(Function);
  });

  it('should return initial api as plain javascript object', () => {
    expect(walletApi.hasOwnProperty('apiVersion')).toBe(true);
    expect(walletApi.hasOwnProperty('name')).toBe(true);
    expect(walletApi.hasOwnProperty('icon')).toBe(true);
    expect(walletApi.connect).toBeDefined();
  });

  describe('connect', () => {
    it('resolves with decoded api when access granted', async () => {
      (authenticator.requestAccess as Mock).mockResolvedValue(true);
      const decodedApi = await walletApi.connect(NetworkId.NetworkId.Preview);
      expect(decodedApi).toHaveProperty('getUnshieldedBalances');
      expect(decodedApi).toHaveProperty('getShieldedBalances');
      expect(decodedApi).toHaveProperty('getDustBalance');
      expect(decodedApi).toHaveProperty('getShieldedAddresses');
      expect(decodedApi).toHaveProperty('getUnshieldedAddress');
      expect(decodedApi).toHaveProperty('getDustAddress');
      expect(decodedApi).toHaveProperty('getTxHistory');
      expect(decodedApi).toHaveProperty('balanceUnsealedTransaction');
      expect(decodedApi).toHaveProperty('balanceSealedTransaction');
      expect(decodedApi).toHaveProperty('makeTransfer');
      expect(decodedApi).toHaveProperty('makeIntent');
      expect(decodedApi).toHaveProperty('signData');
      expect(decodedApi).toHaveProperty('submitTransaction');
      expect(decodedApi).toHaveProperty('getConfiguration');
      expect(decodedApi).toHaveProperty('getConnectionStatus');
      expect(decodedApi).toHaveProperty('hintUsage');
    });

    it('resolves with decoded api when dapp is already approved', async () => {
      (authenticator.haveAccess as Mock).mockResolvedValue(true);
      const decodedApi = await walletApi.connect(NetworkId.NetworkId.Preview);
      expect(authenticator.requestAccess).not.toHaveBeenCalled();
      expect(decodedApi).toHaveProperty('getUnshieldedBalances');
      expect(decodedApi).toHaveProperty('getShieldedBalances');
    });

    it('throws APIError when access is not granted', async () => {
      (authenticator.haveAccess as Mock).mockResolvedValue(false);
      (authenticator.requestAccess as Mock).mockResolvedValue(false);
      await expect(
        walletApi.connect(NetworkId.NetworkId.Preview),
      ).rejects.toThrow(
        new APIError(ErrorCodes.Rejected, 'Access to wallet api denied'),
      );
    });

    it('throws APIError with InternalError when FF is disabled', async () => {
      const walletApiWithDisabledFF = new MidnightWalletApi(
        testWalletProperties,
        {
          api: testWalletApi,
          authenticator,
          featureFlagProbe: stubFeatureFlagProbe(false),
          logger,
        },
      );

      await expect(
        walletApiWithDisabledFF.connect(NetworkId.NetworkId.Preview),
      ).rejects.toThrow(
        new APIError(
          ErrorCodes.InternalError,
          'Midnight wallet API is not available. The DApp connector functionality may be disabled.',
        ),
      );
    });

    it('does not call checkNetworkSupport or authenticator when FF is disabled', async () => {
      vi.mocked(testWalletApi.checkNetworkSupport).mockClear();
      const probe = stubFeatureFlagProbe(false);
      authenticator = stubAuthenticator();
      const walletApiWithDisabledFF = new MidnightWalletApi(
        testWalletProperties,
        {
          api: testWalletApi,
          authenticator,
          featureFlagProbe: probe,
          logger,
        },
      );

      await expect(
        walletApiWithDisabledFF.connect(NetworkId.NetworkId.Preview),
      ).rejects.toThrow();

      expect(testWalletApi.checkNetworkSupport).not.toHaveBeenCalled();
      expect(authenticator.haveAccess).not.toHaveBeenCalled();
      expect(authenticator.requestAccess).not.toHaveBeenCalled();
    });

    it('throws APIError with InternalError when authenticator throws NoWalletAvailable via haveAccess', async () => {
      (authenticator.haveAccess as Mock).mockRejectedValue(
        new AuthenticatorError(
          AuthenticatorErrorCode.NoWalletAvailable,
          'No wallet available for Midnight',
        ),
      );

      await expect(
        walletApi.connect(NetworkId.NetworkId.Preview),
      ).rejects.toThrow(
        new APIError(
          ErrorCodes.InternalError,
          'No Midnight wallet available. Please create or restore a wallet first.',
        ),
      );
    });

    it('does not call checkNetworkSupport when authenticator throws NoWalletAvailable', async () => {
      vi.mocked(testWalletApi.checkNetworkSupport).mockClear();
      (authenticator.haveAccess as Mock).mockRejectedValue(
        new AuthenticatorError(
          AuthenticatorErrorCode.NoWalletAvailable,
          'No wallet available for Midnight',
        ),
      );

      await expect(
        walletApi.connect(NetworkId.NetworkId.Preview),
      ).rejects.toThrow();

      expect(testWalletApi.checkNetworkSupport).not.toHaveBeenCalled();
    });

    it('throws APIError with InternalError when authenticator throws NoWalletAvailable via requestAccess', async () => {
      (authenticator.haveAccess as Mock).mockResolvedValue(false);
      (authenticator.requestAccess as Mock).mockRejectedValue(
        new AuthenticatorError(
          AuthenticatorErrorCode.NoWalletAvailable,
          'No wallet available for Midnight',
        ),
      );

      await expect(
        walletApi.connect(NetworkId.NetworkId.Preview),
      ).rejects.toThrow(
        new APIError(
          ErrorCodes.InternalError,
          'No Midnight wallet available. Please create or restore a wallet first.',
        ),
      );
    });

    it('translates serialized AuthenticatorError (by shape) to APIError', async () => {
      const serializedError = Object.assign(new Error('No wallet'), {
        name: 'AuthenticatorError',
        code: AuthenticatorErrorCode.NoWalletAvailable,
      });
      (authenticator.haveAccess as Mock).mockRejectedValue(serializedError);

      await expect(
        walletApi.connect(NetworkId.NetworkId.Preview),
      ).rejects.toThrow(
        new APIError(
          ErrorCodes.InternalError,
          'No Midnight wallet available. Please create or restore a wallet first.',
        ),
      );
    });

    it('re-throws unexpected errors from authenticator', async () => {
      (authenticator.haveAccess as Mock).mockRejectedValue(
        new Error('Network failure'),
      );

      await expect(
        walletApi.connect(NetworkId.NetworkId.Preview),
      ).rejects.toThrow('Network failure');
    });
  });
});
