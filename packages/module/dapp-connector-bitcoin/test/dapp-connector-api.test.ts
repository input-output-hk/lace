import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConsumeRemoteApi, mockInjectGlobal } = vi.hoisted(() => ({
  mockConsumeRemoteApi: vi.fn(),
  mockInjectGlobal: vi.fn(),
}));

vi.mock('@lace-lib/extension-messaging', async () => {
  const actual = await vi.importActual('@lace-lib/extension-messaging');
  return {
    ...actual,
    consumeRemoteApi: mockConsumeRemoteApi,
  };
});

vi.mock('@lace-lib/dapp-connector', async () => {
  const actual = await vi.importActual('@lace-lib/dapp-connector');
  return {
    ...actual,
    injectGlobal: mockInjectGlobal,
  };
});

import { BitcoinAPIError } from '../src/api-error';
import { BitcoinDappWalletApi } from '../src/bitcoin-wallet-api';
import { WalletApiMethodNames } from '../src/const';
import {
  bitcoinDappConnectorWalletApiErrors,
  bitcoinDappConnectorWalletApiProperties,
  dappConnectorApi,
} from '../src/dapp-connector-api';
import {
  BITCOIN_AUTHENTICATOR_API_CHANNEL,
  BITCOIN_WALLET_API_CHANNEL,
} from '../src/messaging';

import type { InjectDependencies } from '@lace-contract/dapp-connector';

Object.defineProperty(global, 'window', {
  value: {},
  writable: true,
  configurable: true,
});

describe('dappConnectorApi', () => {
  it('lists BitcoinAPIError as the deserializable wallet channel error type', () => {
    expect(bitcoinDappConnectorWalletApiErrors).toEqual([BitcoinAPIError]);
  });

  it('builds remote api properties for all wallet methods', () => {
    expect(Object.keys(bitcoinDappConnectorWalletApiProperties)).toEqual(
      WalletApiMethodNames,
    );
  });

  it('exposes the wallet channel proxy entry', () => {
    expect(dappConnectorApi.proxy).toEqual([
      {
        baseChannel: BITCOIN_WALLET_API_CHANNEL,
        properties: bitcoinDappConnectorWalletApiProperties,
        errorTypes: bitcoinDappConnectorWalletApiErrors,
      },
    ]);
  });

  it('declares the Bitcoin authenticator descriptor', () => {
    expect(dappConnectorApi.authenticator).toEqual({
      baseChannelName: BITCOIN_AUTHENTICATOR_API_CHANNEL,
      blockchainName: 'Bitcoin',
    });
  });

  describe('inject', () => {
    const dependencies: InjectDependencies = {
      logger: dummyLogger,
      runtime: {} as InjectDependencies['runtime'],
    };

    beforeEach(() => {
      mockConsumeRemoteApi.mockReset().mockReturnValue({});
      mockInjectGlobal.mockReset();
    });

    it('consumes the authenticator, wallet and feature flag channels', () => {
      dappConnectorApi.inject(dependencies);

      expect(mockConsumeRemoteApi).toHaveBeenCalledTimes(3);
      expect(mockConsumeRemoteApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseChannel: BITCOIN_AUTHENTICATOR_API_CHANNEL,
        }),
        expect.objectContaining({
          logger: dependencies.logger,
          runtime: dependencies.runtime,
        }),
      );
      expect(mockConsumeRemoteApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseChannel: BITCOIN_WALLET_API_CHANNEL,
          properties: bitcoinDappConnectorWalletApiProperties,
          errorTypes: bitcoinDappConnectorWalletApiErrors,
        }),
        expect.objectContaining({
          logger: dependencies.logger,
          runtime: dependencies.runtime,
        }),
      );
    });

    it('injects the wallet object at window.bitcoin.lace', () => {
      dappConnectorApi.inject(dependencies);

      expect(mockInjectGlobal).toHaveBeenCalledTimes(1);
      const [props] = mockInjectGlobal.mock.calls[0] as [
        {
          namespace: string;
          walletName: string;
          rdns?: string;
          wallet: unknown;
        },
      ];

      expect(props.namespace).toBe('bitcoin');
      expect(props.walletName).toBe('lace');
      expect(props.rdns).toBe('io.lace.wallet');
      expect(props.wallet).toBeInstanceOf(BitcoinDappWalletApi);
    });
  });
});
