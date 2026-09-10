import {
  AuthenticatorError,
  AuthenticatorErrorCode,
} from '@lace-contract/dapp-connector';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinAPIError, BitcoinAPIErrorCode } from '../src/api-error';
import { BitcoinDappWalletApi } from '../src/bitcoin-wallet-api';
import { FEATURE_FLAG_BITCOIN_DAPP_CONNECTOR } from '../src/const';

import type { BitcoinWalletApi } from '../src/types';
import type { FeatureFlagProbe } from '@lace-contract/dapp-connector';
import type { RemoteAuthenticator } from '@lace-lib/dapp-connector';
import type { Mock } from 'vitest';

const stubAuthenticator = (requestAccessResult = true): RemoteAuthenticator =>
  ({
    haveAccess: vi.fn().mockResolvedValue(false),
    requestAccess: vi.fn().mockResolvedValue(requestAccessResult),
  } as unknown as RemoteAuthenticator);

const stubFeatureFlagProbe = (enabled = true): FeatureFlagProbe => ({
  getFeatureFlags: vi
    .fn()
    .mockResolvedValue(
      enabled ? [{ key: FEATURE_FLAG_BITCOIN_DAPP_CONNECTOR }] : [],
    ),
});

const stubApi = (): BitcoinWalletApi => ({
  getAccounts: vi.fn().mockResolvedValue(['bc1qtest']),
  getNetwork: vi.fn().mockResolvedValue('mainnet'),
  getBalance: vi
    .fn()
    .mockResolvedValue({ confirmed: 100, unconfirmed: 0, total: 100 }),
  getUtxos: vi.fn().mockResolvedValue([]),
  signMessage: vi.fn().mockResolvedValue('signature'),
  signPsbt: vi.fn().mockResolvedValue('signed-psbt'),
  sendBitcoin: vi.fn().mockResolvedValue('txid'),
  pushTx: vi.fn().mockResolvedValue('txid'),
});

Object.defineProperty(global, 'location', {
  value: {
    origin: 'https://test-dapp.io',
    href: 'https://test-dapp.io',
  },
});

describe('BitcoinDappWalletApi', () => {
  const logger = dummyLogger;
  let authenticator: RemoteAuthenticator;
  let api: BitcoinWalletApi;
  let walletApi: BitcoinDappWalletApi;

  beforeEach(() => {
    authenticator = stubAuthenticator();
    api = stubApi();
    walletApi = new BitcoinDappWalletApi(
      { name: 'lace' },
      {
        api,
        authenticator,
        featureFlagProbe: stubFeatureFlagProbe(true),
        logger,
      },
    );
  });

  it('exposes name, icon, apiVersion and enable', () => {
    expect(walletApi.name).toBe('lace');
    expect(walletApi.icon).toBe('');
    expect(walletApi.apiVersion).toBe('1.0.0');
    expect(walletApi.enable).toBeInstanceOf(Function);
  });

  it('defaults icon to the provided value when set', () => {
    const withIcon = new BitcoinDappWalletApi(
      { name: 'lace', icon: 'data:image/png;base64,abc' },
      {
        api,
        authenticator,
        featureFlagProbe: stubFeatureFlagProbe(true),
        logger,
      },
    );
    expect(withIcon.icon).toBe('data:image/png;base64,abc');
  });

  describe('enable', () => {
    it('resolves with all 8 wallet methods when access is granted', async () => {
      const enabledApi = await walletApi.enable();

      expect(enabledApi).toHaveProperty('getAccounts');
      expect(enabledApi).toHaveProperty('getNetwork');
      expect(enabledApi).toHaveProperty('getBalance');
      expect(enabledApi).toHaveProperty('getUtxos');
      expect(enabledApi).toHaveProperty('signMessage');
      expect(enabledApi).toHaveProperty('signPsbt');
      expect(enabledApi).toHaveProperty('sendBitcoin');
      expect(enabledApi).toHaveProperty('pushTx');
    });

    it('re-requests access on every enable, even when already approved', async () => {
      await walletApi.enable();
      await walletApi.enable();

      expect(authenticator.requestAccess).toHaveBeenCalledTimes(2);
    });

    it('throws BitcoinAPIError with Refused when access is not granted', async () => {
      authenticator = stubAuthenticator(false);
      walletApi = new BitcoinDappWalletApi(
        { name: 'lace' },
        {
          api,
          authenticator,
          featureFlagProbe: stubFeatureFlagProbe(true),
          logger,
        },
      );

      await expect(walletApi.enable()).rejects.toThrow(
        new BitcoinAPIError(
          BitcoinAPIErrorCode.Refused,
          'Access to wallet API denied',
        ),
      );
    });

    it('throws BitcoinAPIError with InternalError when the FF is disabled', async () => {
      walletApi = new BitcoinDappWalletApi(
        { name: 'lace' },
        {
          api,
          authenticator,
          featureFlagProbe: stubFeatureFlagProbe(false),
          logger,
        },
      );

      await expect(walletApi.enable()).rejects.toThrow(
        new BitcoinAPIError(
          BitcoinAPIErrorCode.InternalError,
          'Bitcoin wallet API is not available. The DApp connector functionality may be disabled.',
        ),
      );
    });

    it('does not call the authenticator when the FF is disabled', async () => {
      walletApi = new BitcoinDappWalletApi(
        { name: 'lace' },
        {
          api,
          authenticator,
          featureFlagProbe: stubFeatureFlagProbe(false),
          logger,
        },
      );

      await expect(walletApi.enable()).rejects.toThrow();

      expect(authenticator.requestAccess).not.toHaveBeenCalled();
    });

    it('throws BitcoinAPIError with InternalError when the authenticator throws NoWalletAvailable', async () => {
      authenticator = {
        haveAccess: vi.fn().mockResolvedValue(false),
        requestAccess: vi
          .fn()
          .mockRejectedValue(
            new AuthenticatorError(
              AuthenticatorErrorCode.NoWalletAvailable,
              'No wallet available for Bitcoin',
            ),
          ),
      };
      walletApi = new BitcoinDappWalletApi(
        { name: 'lace' },
        {
          api,
          authenticator,
          featureFlagProbe: stubFeatureFlagProbe(true),
          logger,
        },
      );

      await expect(walletApi.enable()).rejects.toThrow(
        new BitcoinAPIError(
          BitcoinAPIErrorCode.InternalError,
          'No Bitcoin wallet available. Please create or restore a wallet first.',
        ),
      );
    });

    it('translates serialized AuthenticatorError (by shape) to BitcoinAPIError', async () => {
      const serializedError = Object.assign(new Error('No wallet'), {
        name: 'AuthenticatorError',
        code: AuthenticatorErrorCode.NoWalletAvailable,
      });
      authenticator = {
        haveAccess: vi.fn().mockResolvedValue(false),
        requestAccess: vi.fn().mockRejectedValue(serializedError),
      };
      walletApi = new BitcoinDappWalletApi(
        { name: 'lace' },
        {
          api,
          authenticator,
          featureFlagProbe: stubFeatureFlagProbe(true),
          logger,
        },
      );

      await expect(walletApi.enable()).rejects.toThrow(
        new BitcoinAPIError(
          BitcoinAPIErrorCode.InternalError,
          'No Bitcoin wallet available. Please create or restore a wallet first.',
        ),
      );
    });

    it('re-throws unexpected errors from the authenticator', async () => {
      authenticator = {
        haveAccess: vi.fn().mockResolvedValue(false),
        requestAccess: vi.fn().mockRejectedValue(new Error('Network failure')),
      };
      walletApi = new BitcoinDappWalletApi(
        { name: 'lace' },
        {
          api,
          authenticator,
          featureFlagProbe: stubFeatureFlagProbe(true),
          logger,
        },
      );

      await expect(walletApi.enable()).rejects.toThrow('Network failure');
    });

    it('passes signMessage arguments through unchanged', async () => {
      const enabledApi = await walletApi.enable();

      await enabledApi.signMessage('hello world', 'bip322-simple');

      expect(api.signMessage).toHaveBeenCalledWith(
        'hello world',
        'bip322-simple',
      );
    });

    it('passes signPsbt arguments through unchanged', async () => {
      const enabledApi = await walletApi.enable();
      const options = { autoFinalized: false, toSignInputs: [{ index: 0 }] };

      await enabledApi.signPsbt('cHNidA==', options);

      expect(api.signPsbt).toHaveBeenCalledWith('cHNidA==', options);
    });

    it('propagates errors thrown by the remote api', async () => {
      (api.signPsbt as Mock).mockRejectedValue(new Error('user rejected'));
      const enabledApi = await walletApi.enable();

      await expect(enabledApi.signPsbt('cHNidA==')).rejects.toThrow(
        'user rejected',
      );
    });
  });
});
